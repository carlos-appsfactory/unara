import { LuggageCategory } from "src/luggage-categories/entities/luggage-category.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { LuggageItem } from "./luggage-item.entity";
import { Trip } from "src/trips/entities/trip.entity";

@Entity()
export class Luggage {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string
    
    @OneToMany(
      () => LuggageItem, 
      luggageItem => luggageItem.luggage, 
      { cascade: true }
    )
    luggageItems: LuggageItem[];

    @ManyToOne(
      () => Trip,
      trip => trip.luggage,
      { nullable: true, onDelete: 'SET NULL' }
    )
    trip?: Trip;

    // TODO usuario asociado
    
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
