import { Place } from "src/places/entities/place.entity";
import { Trip } from "src/trips/entities/trip.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Activity {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 255 })
    name: string
    
    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'timestamp' })
    date: Date

    @ManyToOne(
        () => Trip, 
        trip => trip.activities,
        { onDelete: 'CASCADE' }
    )
    trip: Trip

    @ManyToOne(
        () => Place, 
        place => place.activities,
        { onDelete: 'CASCADE' }
    )
    place?: Place
}
