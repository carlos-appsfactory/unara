import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { FilterUserDto } from './dto/filter-user.dto';

@Injectable()
export class UsersService {
  
  private readonly logger = new Logger('LuggageService')

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ){}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = this.userRepository.create(createUserDto)
      await this.userRepository.save(user)
      return user

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(filterUserDto: FilterUserDto) {
    const { 
      limit = 10, 
      offset = 0,
      email,
      username,
    } = filterUserDto

    const query = this.userRepository.createQueryBuilder('user')

    if (email) query.andWhere('user.email ILIKE :email', { email: `%${email}%`})
    
    if (username) query.andWhere('user.username ILIKE :username', { username: `%${username}%`})

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id })

    if (!user){
      throw new NotFoundException(`User with id ${id} not found`)
    }

    return user
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
