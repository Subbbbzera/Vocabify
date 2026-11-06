import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../../user/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: Omit<User, 'password'>;
}

export const CurrentUser = createParamDecorator(
  <K extends keyof Omit<User, 'password'>>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): Omit<User, 'password'> | Omit<User, 'password'>[K] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
