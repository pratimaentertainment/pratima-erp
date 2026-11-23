import { PaginatedResult, PaginationParams } from '../pagination';
import { FilterParam } from '../filters';
import { SortParam } from '../sorting';

export interface RepositoryFindOptions {
  pagination?: PaginationParams;
  filters?: FilterParam[];
  sort?: SortParam[];
  include?: Record<string, boolean | object>;
}

export interface BaseRepository<Entity> {
  findById(id: string): Promise<Entity | null>;
  findMany(options?: RepositoryFindOptions): Promise<PaginatedResult<Entity>>;
  create(data: Partial<Entity>): Promise<Entity>;
  update(id: string, data: Partial<Entity>): Promise<Entity>;
  delete(id: string): Promise<void>;
  count(filters?: FilterParam[]): Promise<number>;
}

export abstract class AbstractRepository<Entity> implements BaseRepository<Entity> {
  constructor(protected readonly prisma: any) {}

  abstract findById(id: string): Promise<Entity | null>;
  abstract findMany(options?: RepositoryFindOptions): Promise<PaginatedResult<Entity>>;
  abstract create(data: Partial<Entity>): Promise<Entity>;
  abstract update(id: string, data: Partial<Entity>): Promise<Entity>;
  abstract delete(id: string): Promise<void>;
  abstract count(filters?: FilterParam[]): Promise<number>;
}
