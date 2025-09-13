import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuggageModule } from './luggage/luggage.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { LuggageCategoriesModule } from './luggage-categories/luggage-categories.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';

@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    }),

    LuggageModule,

    CommonModule,

    UsersModule,

    ItemsModule,

    LuggageCategoriesModule,

    ItemCategoriesModule
  ],
})
export class AppModule {}
