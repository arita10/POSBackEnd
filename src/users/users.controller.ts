import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * @controller UsersController
 * @description Handles HTTP requests for User management.
 * Base route: /shops/:shopId/users
 *
 * WHY nested under /shops/:shopId?
 * Because users BELONG to a shop. The shopId in the URL enforces tenancy.
 * This is a RESTful design: the URL itself expresses the data relationship.
 *
 * Endpoints:
 *   POST   /shops/:shopId/users          → Create a user in this shop
 *   GET    /shops/:shopId/users          → List all users in this shop
 *   GET    /shops/:shopId/users/:id      → Get one user from this shop
 *   PUT    /shops/:shopId/users/:id      → Update a user in this shop
 *   DELETE /shops/:shopId/users/:id      → Delete a user from this shop
 */
@Controller('shops/:shopId/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * @route POST /shops/:shopId/users
   * @description Create a new user in the specified shop.
   * @param {number} shopId - The shop ID from the URL.
   * @body {CreateUserDto} dto - { username, password, role? }
   */
  @Post()
  create(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(shopId, dto);
  }

  /**
   * @route GET /shops/:shopId/users
   * @description List all users belonging to the specified shop.
   * @param {number} shopId - The shop ID from the URL.
   */
  @Get()
  findAll(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.usersService.findAllByShop(shopId);
  }

  /**
   * @route GET /shops/:shopId/users/:id
   * @description Get a single user from the specified shop.
   * @param {number} shopId - The shop ID from the URL.
   * @param {number} id - The user ID from the URL.
   */
  @Get(':id')
  findOne(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findOne(shopId, id);
  }

  /**
   * @route PUT /shops/:shopId/users/:id
   * @description Update a user in the specified shop.
   * @param {number} shopId - The shop ID from the URL.
   * @param {number} id - The user ID from the URL.
   * @body {UpdateUserDto} dto - Fields to update.
   */
  @Put(':id')
  update(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(shopId, id, dto);
  }

  /**
   * @route DELETE /shops/:shopId/users/:id
   * @description Delete a user from the specified shop.
   * @param {number} shopId - The shop ID from the URL.
   * @param {number} id - The user ID from the URL.
   */
  @Delete(':id')
  remove(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.remove(shopId, id);
  }
}
