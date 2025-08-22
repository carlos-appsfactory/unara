import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator"

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    fullname: string

    @IsEmail()
    @MaxLength(255)
    email: string
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    username: string

    @IsString()
    @IsNotEmpty()
    password: string

    @IsString()
    @IsOptional()
    profile_picture?: string
}
