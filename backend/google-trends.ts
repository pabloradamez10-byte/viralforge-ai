import type { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { ChangePasswordDto, UpdateUserDto } from './users.dto.js';

export class UsersController {
  constructor(private service = new UsersService()) {}

  me = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.me(req.userId!) });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const dto = UpdateUserDto.parse(req.body);
    res.json({ data: await this.service.update(req.userId!, dto) });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const dto = ChangePasswordDto.parse(req.body);
    await this.service.changePassword(req.userId!, dto);
    res.status(204).send();
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.delete(req.userId!);
    res.status(204).send();
  });

  usage = asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await this.service.usage(req.userId!) });
  });
}
