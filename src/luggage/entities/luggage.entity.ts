import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum LuggageType {
  SMALL_BACKPACK = "small_backpack",
  LARGE_BACKPACK = "large_backpack",
  SMALL_SUITCASE = "small_suitcase",
  LARGE_SUITCASE = "large_suitcase",
}

@Entity()
export class Luggage {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string

    @Column({
        type: "enum",
        enum: LuggageType,
    })
    type: LuggageType

    // TODO viaje asociado
    // TODO usuario asociado
    
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
