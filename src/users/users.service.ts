import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponseDto, user);
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.update(userId, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponseDto, user);
  }

  async deleteProfile(userId: string): Promise<void> {
    const deleted = await this.usersRepository.delete(userId);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }
}
