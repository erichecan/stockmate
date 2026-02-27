// Updated: 2026-02-27T04:30:00
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { code_tenantId: { code: dto.code, tenantId } },
    });
    if (existing) {
      throw new ConflictException(`Category code "${dto.code}" already exists`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        code: dto.code,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, tree = false) {
    if (tree) {
      return this.findTree(tenantId);
    }

    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { children: { where: { isActive: true } } },
    });
  }

  async findTree(tenantId: string): Promise<CategoryTreeNode[]> {
    const all = await this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const map = new Map<string, CategoryTreeNode>();
    for (const cat of all) {
      map.set(cat.id, { ...cat, children: [] });
    }

    const roots: CategoryTreeNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findOne(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, tenantId: string, dto: UpdateCategoryDto) {
    await this.findOne(id, tenantId);

    if (dto.code) {
      const existing = await this.prisma.category.findFirst({
        where: { code: dto.code, tenantId, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Category code "${dto.code}" already exists`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
