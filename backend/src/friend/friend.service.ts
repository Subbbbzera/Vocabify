import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
    const statsMap = await this.getBatchUserStats([userId]);
    return statsMap[userId] || { totalDictionaries: 0, totalWords: 0, learnedWords: 0 };
  }

  private async getBatchUserStats(userIds: number[]) {
    const uniqueIds = Array.from(new Set(userIds));
    const result: Record<
      number,
      { totalDictionaries: number; totalWords: number; learnedWords: number }
    > = {};

    for (const id of uniqueIds) {
      result[id] = { totalDictionaries: 0, totalWords: 0, learnedWords: 0 };
    }

    if (uniqueIds.length === 0) {
      return result;
    }

    const [dictCounts, wordCounts] = await Promise.all([
      this.dictionaryRepo
        .createQueryBuilder('dict')
        .select('dict.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('dict.userId IN (:...userIds)', { userIds: uniqueIds })
        .groupBy('dict.userId')
        .getRawMany(),
      this.wordRepo
        .createQueryBuilder('word')
        .innerJoin('dictionary', 'dict', 'word.dictionaryId = dict.dictionaryId')
        .select('dict.userId', 'userId')
        .addSelect('COUNT(*)', 'totalWords')
        .addSelect(
          'SUM(CASE WHEN word.remembered = true THEN 1 ELSE 0 END)',
          'learnedWords',
        )
        .where('dict.userId IN (:...userIds)', { userIds: uniqueIds })
        .groupBy('dict.userId')
        .getRawMany(),
    ]);

    for (const row of dictCounts) {
      const uid = Number(row.userId || row.userid);
      if (result[uid]) {
        result[uid].totalDictionaries = Number(row.count || 0);
      }
    }

    for (const row of wordCounts) {
      const uid = Number(row.userId || row.userid);
      if (result[uid]) {
        result[uid].totalWords = Number(row.totalWords || row.totalwords || 0);
        result[uid].learnedWords = Number(row.learnedWords || row.learnedwords || 0);
      }
    }

    return result;
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

    if (friendships.length === 0) {
      return [];
    }

    const friendIds = friendships.map((f) =>
      f.sender.id === userId ? f.receiver.id : f.sender.id,
    );

    const [statsMap, unreadRows, messages] = await Promise.all([
      this.getBatchUserStats(friendIds),
      this.messageRepo
        .createQueryBuilder('msg')
        .select('msg.senderId', 'senderId')
        .addSelect('COUNT(*)', 'count')
        .where('msg.receiverId = :userId', { userId })
        .andWhere('msg.senderId IN (:...friendIds)', { friendIds })
        .andWhere('msg.isRead = false')
        .groupBy('msg.senderId')
        .getRawMany(),
      this.messageRepo.find({
        where: [
          { sender: { id: userId }, receiver: { id: In(friendIds) } },
          { sender: { id: In(friendIds) }, receiver: { id: userId } },
        ],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const unreadMap: Record<number, number> = {};
    for (const row of unreadRows) {
      const sid = Number(row.senderId || row.senderid);
      unreadMap[sid] = Number(row.count || 0);
    }

    const lastMessageMap = new Map<
      number,
      { text: string; createdAt: Date; senderId: number }
    >();
    for (const msg of messages) {
      const partnerId = msg.sender.id === userId ? msg.receiver.id : msg.sender.id;
      if (!lastMessageMap.has(partnerId)) {
        lastMessageMap.set(partnerId, {
          text: msg.text,
          createdAt: msg.createdAt,
          senderId: msg.sender.id,
        });
      }
    }

    return friendships.map((f) => {
      const friend = f.sender.id === userId ? f.receiver : f.sender;
      return {
        friendshipId: f.id,
        friend: {
          id: friend.id,
          name: friend.name,
          avatarUrl: friend.avatarUrl,
          streakCount: friend.streakCount,
          lastPracticeDate: friend.lastPracticeDate,
          lastSeen: friend.lastSeen,
          isOnline: this.chatGateway ? this.chatGateway.isUserOnline(friend.id) : false,
          duelWins: friend.duelWins,
          duelLosses: friend.duelLosses,
        },
        stats: statsMap[friend.id] || {
          totalDictionaries: 0,
          totalWords: 0,
          learnedWords: 0,
        },
        unreadCount: unreadMap[friend.id] || 0,
        lastMessage: lastMessageMap.get(friend.id) || null,
      };
    });
  }

  async getRequests(userId: number) {
    const [incoming, outgoing] = await Promise.all([
      this.friendshipRepo.find({
        where: { receiver: { id: userId }, status: 'PENDING' },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
      }),
      this.friendshipRepo.find({
        where: { sender: { id: userId }, status: 'PENDING' },
        relations: ['receiver'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const statsMap = await this.getBatchUserStats([
      ...incoming.map((r) => r.sender.id),
      ...outgoing.map((r) => r.receiver.id),
    ]);

    const incomingWithStats = incoming.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      user: {
        id: r.sender.id,
        name: r.sender.name,
        avatarUrl: r.sender.avatarUrl,
        streakCount: r.sender.streakCount,
        duelWins: r.sender.duelWins,
        duelLosses: r.sender.duelLosses,
      },
      stats: statsMap[r.sender.id] || {
        totalDictionaries: 0,
        totalWords: 0,
        learnedWords: 0,
      },
    }));

    const outgoingWithStats = outgoing.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      user: {
        id: r.receiver.id,
        name: r.receiver.name,
        avatarUrl: r.receiver.avatarUrl,
        streakCount: r.receiver.streakCount,
        duelWins: r.receiver.duelWins,
        duelLosses: r.receiver.duelLosses,
      },
      stats: statsMap[r.receiver.id] || {
        totalDictionaries: 0,
        totalWords: 0,
        learnedWords: 0,
      },
    }));

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
      .andWhere('LOWER(user.name) LIKE LOWER(:query)', { query: `%${cleanQuery}%` })
      .take(20)
      .getMany();

    if (users.length === 0) return [];

    const foundIds = users.map((u) => u.id);
    const [statsMap, friendships] = await Promise.all([
      this.getBatchUserStats(foundIds),
      this.friendshipRepo.find({
        where: [
          { sender: { id: currentUserId }, receiver: { id: In(foundIds) } },
          { sender: { id: In(foundIds) }, receiver: { id: currentUserId } },
        ],
        relations: ['sender', 'receiver'],
      }),
    ]);

    const friendshipByTargetId = new Map<number, Friendship>();
    for (const f of friendships) {
      const targetId = f.sender.id === currentUserId ? f.receiver.id : f.sender.id;
      friendshipByTargetId.set(targetId, f);
    }

    return users.map((u) => {
      const friendship = friendshipByTargetId.get(u.id);
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
        avatarUrl: u.avatarUrl,
        streakCount: u.streakCount,
        duelWins: u.duelWins,
        duelLosses: u.duelLosses,
        lastPracticeDate: u.lastPracticeDate,
        stats: statsMap[u.id] || {
          totalDictionaries: 0,
          totalWords: 0,
          learnedWords: 0,
        },
        relationship,
        requestId,
      };
    });
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
      avatarUrl: user.avatarUrl,
      streakCount: user.streakCount,
      lastPracticeDate: user.lastPracticeDate,
      lastSeen: user.lastSeen,
      isOnline: this.chatGateway ? this.chatGateway.isUserOnline(userId) : false,
      duelWins: user.duelWins,
      duelLosses: user.duelLosses,
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
        where: [
          { id: replyToId, sender: { id: userId }, receiver: { id: friendId } },
          { id: replyToId, sender: { id: friendId }, receiver: { id: userId } },
        ],
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

    const messageRequests = Array.from(nonFriendMessagesMap.entries()).map(([_, msgs]) => {
      const latestMsg = msgs[0];
      return {
        sender: {
          id: latestMsg.sender.id,
          name: latestMsg.sender.name,
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
