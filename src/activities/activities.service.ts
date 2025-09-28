import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { Repository } from 'typeorm';
import { Trip } from 'src/trips/entities/trip.entity';
import { Place } from 'src/places/entities/place.entity';
import { FilterActivityDto } from './dto/filter-activity.dto';

@Injectable()
export class ActivitiesService {

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,

    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,

    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
  ) {}


  async create(dto: CreateActivityDto) {
    const { tripId, placeId, ...activityData } = dto

    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException(`Trip with id ${tripId} not found`);

    let place: Place | null = null;
    if (placeId) {
      place = await this.placeRepository.findOne({ where: { id: placeId } });
      if (!place) throw new NotFoundException(`Place with id ${placeId} not found`);
    }

    const activity = this.activityRepository.create({
      ...activityData,
      trip,
      ...(place ? { place } : {}),
    });

    return this.activityRepository.save(activity);
  }

  async findAll(dto: FilterActivityDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      description,
      tripId,
      placeId,
      dateFrom,
      dateTo,
    } = dto;

    const query = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.trip', 'trip')
      .leftJoinAndSelect('activity.place', 'place');

    if (name) {
      query.andWhere('activity.name ILIKE :name', { name: `%${name}%` });
    }

    if (description) {
      query.andWhere('activity.description ILIKE :description', { description: `%${description}%` });
    }

    if (tripId) {
      query.andWhere('trip.id = :tripId', { tripId });
    }

    if (placeId) {
      query.andWhere('place.id = :placeId', { placeId });
    }

    if (dateFrom) {
      query.andWhere('activity.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('activity.date <= :dateTo', { dateTo });
    }

    query.skip(offset).take(limit);

    return query.getMany();
  }

  async findOne(id: string) {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: {
        trip: true,
        place: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with id ${id} not found`);
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto) {
    const { tripId, placeId, ...activityData } = dto;

    let trip: Trip | null = null;
    if (tripId) {
      trip = await this.tripRepository.findOneBy({ id: tripId });
      if (!trip) {
        throw new NotFoundException(`Trip with id ${tripId} not found`);
      }
    }

    let place: Place | null = null;
    if (placeId) {
      place = await this.placeRepository.findOneBy({ id: placeId });
      if (!place) {
        throw new NotFoundException(`Place with id ${placeId} not found`);
      }
    }

    const activity = await this.activityRepository.preload({
      id,
      ...activityData,
      ...(trip ? { trip } : {}),
      ...(place ? { place } : {}),
    });

    if (!activity) {
      throw new NotFoundException(`Activity with id ${id} not found`);
    }

    await this.activityRepository.save(activity);
    return activity;
  }

  async remove(id: string) {
    const activity = await this.activityRepository.findOneBy({ id });

    if (!activity) {
      throw new NotFoundException(`Activity with id ${id} not found`);
    }

    await this.activityRepository.remove(activity);
    return { message: `Activity with id ${id} has been removed` };
  }
}
