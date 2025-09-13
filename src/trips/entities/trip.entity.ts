import { Place } from "src/places/entities/place.entity";
import { Luggage } from "src/luggage/entities/luggage.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Trip {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'text' })
    destination: string

    @Column({ type: 'timestamptz' })
    startDate: Date;

    @Column({ type: 'timestamptz' })
    endDate: Date;
    
    @OneToMany(
        () => Place, 
        place => place.trip, 
        { cascade: true }
    )
    places: Place[];

    @OneToMany(
      () => Luggage, 
      luggage => luggage.trip
    )
    luggage: Luggage[];

    // TODO: Añadir relación con usuarios

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
