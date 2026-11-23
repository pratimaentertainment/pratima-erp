export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseDTO {
  id: string;
}

export interface BaseMapper<Entity, DTO> {
  toDTO(entity: Entity): DTO;
  toEntity(dto: DTO): Partial<Entity>;
  toDTOList(entities: Entity[]): DTO[];
}

export abstract class AbstractMapper<Entity, DTO> implements BaseMapper<Entity, DTO> {
  abstract toDTO(entity: Entity): DTO;
  
  toEntity(dto: DTO): Partial<Entity> {
    throw new Error('Method not implemented.');
  }

  toDTOList(entities: Entity[]): DTO[] {
    return entities.map(e => this.toDTO(e));
  }
}
