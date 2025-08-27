import { LuggageCategory } from "src/luggage-categories/entities/luggage-category.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { LuggageItem } from "./luggage-item.entity";

@Entity()
export class Luggage {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text')
    name: string

    @ManyToOne(
        () => LuggageCategory,
        (category) => category.luggage,
        { nullable: false }
    )
    category: LuggageCategory
    
    @OneToMany(
      () => LuggageItem, 
      luggageItem => luggageItem.luggage, 
      { cascade: true }
    )
    luggageItems: LuggageItem[];

    // TODO viaje asociado
    // TODO usuario asociado
    
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}
