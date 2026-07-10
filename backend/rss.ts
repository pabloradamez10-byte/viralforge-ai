import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { UsersRepository } from './users.repository.js';
import { NotFoundError, UnauthorizedError } from '../../shared/errors/app-error.js';
import type { ChangePasswordDto, UpdateUserDto } from './users.dto.js';

export class UsersService {
  constructor(private repo = new UsersRepository()) {}

  async me(userId: string) {
    const u = await this.repo.findById(userId);
    if (!u) throw new NotFoundError('User');
    const { passwordHash: _h, ...safe } = u;
    return safe;
  }

  async update(userId: string, dto: UpdateUserDto) {
    await this.repo.update(userId, dto);
    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const u = await this.repo.findById(userId);
    if (!u) throw new NotFoundError('User');
    const ok = await bcrypt.compare(dto.currentPassword, u.passwordHash);
    if (!ok) throw new UnauthorizedError('Current password is incorrect');
    const newHash = await bcrypt.hash(dto.newPassword, env.BCRYPT_COST);
    await this.repo.update(userId, { passwordHash: newHash });
  }

  async delete(userId: string) {
    await this.repo.delete(userId);
  }

  usage(userId: string) {
    return this.repo.usageSummary(userId);
  }
}
