import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './entities/friendship.entity';
import { DirectMessage } from './entities/message.entity';
import { User } from '../user/entities/user.entity';
import { Dictionary } from '../dictionary/entities/dictionary.entity';
import { Word } from '../word/entities/word.entity';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectRepository(DirectMessage)
    private readonly messageRepo: Repository<DirectMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Dictionary)
    private readonly dictionaryRepo: Repository<Dictionary>,
    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async getUserStats(userId: number) {
    const totalDictionaries = await this.dictionaryRepo.count({
      where: { user: { id: userId } },
    });

    const totalWords = await this.wordRepo
      .createQueryBuilder('word')
      .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
      .where('dict.userId = :userId', { userId })
      .getCount();

    const learnedWords = await this.wordRepo
      .createQueryBuilder('word')
      .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
      .where('dict.userId = :userId', { userId })
      .andWhere('word.remembered = true')
      .getCount();

    return { totalDictionaries, totalWords, learnedWords };
  }

  async getFriends(userId: number) {
    const friendships = await this.friendshipRepo.find({
      where: [
        { sender: { id: userId }, status: 'ACCEPTED' },
        { receiver: { id: userId }, status: 'ACCEPTED' },
      ],
      relations: ['sender', 'receiver'],
      order: { updatedAt: 'DESC' },
    });

    const friendsList = await Promise.all(
      friendships.map(async (f) => {
        const friend = f.sender.id === userId ? f.receiver : f.sender;
        const stats = await this.getUserStats(friend.id);

        const unreadCount = await this.messageRepo.count({
          where: {
            sender: { id: friend.id },
            receiver: { id: userId },
            isRead: false,
          },
        });

        const lastMessage = await this.messageRepo.findOne({
          where: [
            { sender: { id: userId }, receiver: { id: friend.id } },
            { sender: { id: friend.id }, receiver: { id: userId } },
          ],
          order: { createdAt: 'DESC' },
        });

        return {
          friendshipId: f.id,
          friend: {
            id: friend.id,
            name: friend.name,
            email: friend.email,
            avatarUrl: friend.avatarUrl,
            streakCount: friend.streakCount,
            lastPracticeDate: friend.lastPracticeDate,
            lastSeen: friend.lastSeen,
            isOnline: this.chatGateway ? this.chatGateway.isUserOnline(friend.id) : false,
          },
          stats,
          unreadCount,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.sender.id,
              }
            : null,
        };
      }),
    );

    return friendsList;
  }

  async getRequests(userId: number) {
    const incoming = await this.friendshipRepo.find({
      where: { receiver: { id: userId }, status: 'PENDING' },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    const outgoing = await this.friendshipRepo.find({
      where: { sender: { id: userId }, status: 'PENDING' },
      relations: ['receiver'],
      order: { createdAt: 'DESC' },
    });

    const incomingWithStats = await Promise.all(
      incoming.map(async (r) => {
        const stats = await this.getUserStats(r.sender.id);
        return {
          id: r.id,
          createdAt: r.createdAt,
          user: {
            id: r.sender.id,
            name: r.sender.name,
            email: r.sender.email,
            avatarUrl: r.sender.avatarUrl,
            streakCount: r.sender.streakCount,
          },
          stats,
        };
      }),
    );

    const outgoingWithStats = await Promise.all(
      outgoing.map(async (r) => {
        const stats = await this.getUserStats(r.receiver.id);
        return {
          id: r.id,
          createdAt: r.createdAt,
          user: {
            id: r.receiver.id,
            name: r.receiver.name,
            email: r.receiver.email,
            avatarUrl: r.receiver.avatarUrl,
            streakCount: r.receiver.streakCount,
          },
          stats,
        };
      }),
    );

    return {
      incoming: incomingWithStats,
      outgoing: outgoingWithStats,
    };
  }

  async sendRequest(senderId: number, targetUserId: number) {
    if (senderId === targetUserId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    const targetUser = await this.userRepo.findOneBy({ id: targetUserId });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.friendshipRepo.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: targetUserId } },
        { sender: { id: targetUserId }, receiver: { id: senderId } },
      ],
      relations: ['sender', 'receiver'],
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException('You are already friends with this user');
      }
      if (existing.status === 'PENDING') {
        if (existing.sender.id === senderId) {
          throw new BadRequestException('Friend request already sent');
        } else {
          existing.status = 'ACCEPTED';
          return this.friendshipRepo.save(existing);
        }
      }
      existing.sender = { id: senderId } as User;
      existing.receiver = { id: targetUserId } as User;
      existing.status = 'PENDING';
      return this.friendshipRepo.save(existing);
    }

    const newRequest = this.friendshipRepo.create({
      sender: { id: senderId },
      receiver: { id: targetUserId },
      status: 'PENDING',
    });

    return this.friendshipRepo.save(newRequest);
  }

  async acceptRequest(userId: number, requestId: number) {
    const request = await this.friendshipRepo.findOne({
      where: { id: requestId, receiver: { id: userId }, status: 'PENDING' },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found or already processed');
    }

    request.status = 'ACCEPTED';
    return this.friendshipRepo.save(request);
  }

  async declineRequest(userId: number, requestId: number) {
    const request = await this.friendshipRepo.findOne({
      where: [
        { id: requestId, receiver: { id: userId } },
        { id: requestId, sender: { id: userId } },
      ],
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendshipRepo.remove(request);
    return { success: true };
  }

  async removeFriend(userId: number, friendId: number) {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        { sender: { id: userId }, receiver: { id: friendId }, status: 'ACCEPTED' },
        { sender: { id: friendId }, receiver: { id: userId }, status: 'ACCEPTED' },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepo.remove(friendship);
    return { success: true };
  }

  async searchUsers(currentUserId: number, query: string) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      .andWhere(
        '(LOWER(user.name) LIKE LOWER(:query) OR LOWER(user.email) LIKE LOWER(:query))',
        { query: `%${cleanQuery}%` },
      )
      .take(20)
      .getMany();

    const results = await Promise.all(
      users.map(async (u) => {
        const stats = await this.getUserStats(u.id);

        const friendship = await this.friendshipRepo.findOne({
          where: [
            { sender: { id: currentUserId }, receiver: { id: u.id } },
            { sender: { id: u.id }, receiver: { id: currentUserId } },
          ],
          relations: ['sender', 'receiver'],
        });

        let relationship: 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' = 'NONE';
        let requestId: number | null = null;

        if (friendship) {
          if (friendship.status === 'ACCEPTED') {
            relationship = 'FRIENDS';
          } else if (friendship.status === 'PENDING') {
            if (friendship.sender.id === currentUserId) {
              relationship = 'REQUEST_SENT';
            } else {
              relationship = 'REQUEST_RECEIVED';
              requestId = friendship.id;
            }
          }
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
          streakCount: u.streakCount,
          lastPracticeDate: u.lastPracticeDate,
          stats,
          relationship,
          requestId,
        };
      }),
    );

    return results;
  }

  async getUserDetails(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stats = await this.getUserStats(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      streakCount: user.streakCount,
      lastPracticeDate: user.lastPracticeDate,
      lastSeen: user.lastSeen,
      isOnline: this.chatGateway ? this.chatGateway.isUserOnline(userId) : false,
      stats,
    };
  }

  async getMessages(userId: number, friendId: number) {
    const messages = await this.messageRepo.find({
      where: [
        { sender: { id: userId }, receiver: { id: friendId } },
        { sender: { id: friendId }, receiver: { id: userId } },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
      take: 200,
    });

    const unreadIds = messages
      .filter((m) => m.receiver.id === userId && !m.isRead)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await this.messageRepo
        .createQueryBuilder()
        .update(DirectMessage)
        .set({ isRead: true })
        .whereInIds(unreadIds)
        .execute();
    }

    return messages.map((m) => ({
      id: m.id,
      senderId: m.sender.id,
      receiverId: m.receiver.id,
      text: m.text,
      isRead: m.isRead || unreadIds.includes(m.id),
      isEdited: m.isEdited || false,
      replyToId: m.replyToId || null,
      replyToText: m.replyToText || null,
      replyToSenderName: m.replyToSenderName || null,
      reactions: m.reactions || {},
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(userId: number, friendId: number, text: string, replyToId?: number) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new BadRequestException('Message cannot be empty');
    }

    const friend = await this.userRepo.findOneBy({ id: friendId });
    if (!friend) {
      throw new NotFoundException('Recipient user not found');
    }

    let replyToText: string | null = null;
    let replyToSenderName: string | null = null;

    if (replyToId) {
      const origMsg = await this.messageRepo.findOne({
        where: { id: replyToId },
        relations: ['sender'],
      });
      if (origMsg) {
        replyToText = origMsg.text.length > 100 ? origMsg.text.slice(0, 97) + '...' : origMsg.text;
        replyToSenderName = origMsg.sender.name || 'User';
      }
    }

    const message = this.messageRepo.create({
      sender: { id: userId },
      receiver: { id: friendId },
      text: cleanText,
      isRead: false,
      isEdited: false,
      replyToId: replyToId || null,
      replyToText,
      replyToSenderName,
      reactions: {},
    });

    const saved = await this.messageRepo.save(message);

    const result = {
      id: saved.id,
      senderId: userId,
      receiverId: friendId,
      text: saved.text,
      isRead: false,
      isEdited: false,
      replyToId: saved.replyToId,
      replyToText: saved.replyToText,
      replyToSenderName: saved.replyToSenderName,
      reactions: {},
      createdAt: saved.createdAt,
    };

    if (this.chatGateway) {
      this.chatGateway.emitNewMessage(friendId, result);
      this.chatGateway.emitNewMessage(userId, result);
    }

    return result;
  }

  async editMessage(userId: number, messageId: number, text: string) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.text = cleanText;
    message.isEdited = true;
    const updated = await this.messageRepo.save(message);

    const result = {
      id: updated.id,
      senderId: updated.sender.id,
      receiverId: updated.receiver.id,
      text: updated.text,
      isRead: updated.isRead,
      isEdited: true,
      replyToId: updated.replyToId,
      replyToText: updated.replyToText,
      replyToSenderName: updated.replyToSenderName,
      reactions: updated.reactions || {},
      createdAt: updated.createdAt,
    };

    if (this.chatGateway) {
      this.chatGateway.emitMessageEdited(result.receiverId, result);
      this.chatGateway.emitMessageEdited(result.senderId, result);
    }

    return result;
  }

  async deleteMessage(userId: number, messageId: number) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const receiverId = message.receiver.id;
    const senderId = message.sender.id;

    await this.messageRepo.remove(message);

    if (this.chatGateway) {
      this.chatGateway.emitMessageDeleted(receiverId, messageId);
      this.chatGateway.emitMessageDeleted(senderId, messageId);
    }

    return { success: true, messageId };
  }

  async reactToMessage(userId: number, messageId: number, emoji: string) {
    const cleanEmoji = (emoji || '').trim();
    if (!cleanEmoji) {
      throw new BadRequestException('Emoji cannot be empty');
    }

    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.id !== userId && message.receiver.id !== userId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const reactions: Record<string, number[]> = message.reactions || {};
    const alreadyReactedSame = (reactions[cleanEmoji] || []).includes(userId);

    for (const em of Object.keys(reactions)) {
      if (Array.isArray(reactions[em]) && reactions[em].includes(userId)) {
        reactions[em] = reactions[em].filter((id) => id !== userId);
        if (reactions[em].length === 0) {
          delete reactions[em];
        }
      }
    }

    if (!alreadyReactedSame) {
      reactions[cleanEmoji] = [...(reactions[cleanEmoji] || []), userId];
    }

    message.reactions = { ...reactions };
    const saved = await this.messageRepo.save(message);

    const result = {
      id: saved.id,
      senderId: saved.sender.id,
      receiverId: saved.receiver.id,
      text: saved.text,
      isRead: saved.isRead,
      isEdited: saved.isEdited,
      replyToId: saved.replyToId,
      replyToText: saved.replyToText,
      replyToSenderName: saved.replyToSenderName,
      reactions: saved.reactions || {},
      createdAt: saved.createdAt,
    };

    if (this.chatGateway) {
      this.chatGateway.emitMessageReaction(saved.receiver.id, saved.id, saved.reactions || {});
      this.chatGateway.emitMessageReaction(saved.sender.id, saved.id, saved.reactions || {});
    }

    return result;
  }

  async getIncomingAlerts(userId: number) {

    const pendingRequests = await this.friendshipRepo.find({
      where: { receiver: { id: userId }, status: 'PENDING' },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    const unreadMessages = await this.messageRepo.find({
      where: { receiver: { id: userId }, isRead: false },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    const acceptedFriendships = await this.friendshipRepo.find({
      where: [
        { sender: { id: userId }, status: 'ACCEPTED' },
        { receiver: { id: userId }, status: 'ACCEPTED' },
      ],
      relations: ['sender', 'receiver'],
    });

    const friendIds = new Set(
      acceptedFriendships.map((f) => (f.sender.id === userId ? f.receiver.id : f.sender.id)),
    );

    const nonFriendMessagesMap = new Map<number, DirectMessage[]>();
    for (const msg of unreadMessages) {
      if (!friendIds.has(msg.sender.id)) {
        if (!nonFriendMessagesMap.has(msg.sender.id)) {
          nonFriendMessagesMap.set(msg.sender.id, []);
        }
        nonFriendMessagesMap.get(msg.sender.id)!.push(msg);
      }
    }

    const messageRequests = Array.from(nonFriendMessagesMap.entries()).map(([senderId, msgs]) => {
      const latestMsg = msgs[0];
      return {
        sender: {
          id: latestMsg.sender.id,
          name: latestMsg.sender.name,
          email: latestMsg.sender.email,
          avatarUrl: latestMsg.sender.avatarUrl,
          streakCount: latestMsg.sender.streakCount,
        },
        unreadCount: msgs.length,
        lastMessageText: latestMsg.text,
        createdAt: latestMsg.createdAt,
      };
    });

    const friendRequests = pendingRequests.map((req) => ({
      requestId: req.id,
      sender: {
        id: req.sender.id,
        name: req.sender.name,
        email: req.sender.email,
        avatarUrl: req.sender.avatarUrl,
        streakCount: req.sender.streakCount,
      },
      createdAt: req.createdAt,
    }));

    return {
      messageRequests,
      friendRequests,
    };
  }
}
