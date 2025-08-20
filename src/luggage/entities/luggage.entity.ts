import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum LuggageType {
  SMALL_BACKPACK = "mochila pequeña",
  LARGE_BACKPACK = "mochila grande",
  SMALL_SUITCASE = "maleta pequeña",
  LARGE_SUITCASE = "maleta grande",
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
