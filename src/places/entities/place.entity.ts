import { Trip } from 'src/trips/entities/trip.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Place {
    
    @PrimaryGeneratedColumn('uuid')
    id: string
    
    @Column({ type: 'varchar', length: 255 })
    name: string
    
    @Column({ type: 'text', nullable: true })
    description?: string
    
    @Column({ type: 'decimal', precision: 9, scale: 6 })
    latitude: number
    
    @Column({ type: 'decimal', precision: 9, scale: 6 })
    longitude: number
    
    @ManyToOne(
        () => Trip, 
        trip => trip.places, 
        { onDelete: 'CASCADE' }
    )
    trip: Trip;

    // TODO: Añadir relación con usuarios

    // TODO: Añadir links a TikTok, Instagram, etc
    
    @CreateDateColumn()
    createdAt: Date
    
    @UpdateDateColumn()
    updatedAt: Date
}
