import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(shopId: number) {
    return this.prisma.vendor.findMany({
      where: { shopId },
      orderBy: { vendorName: 'asc' },
    });
  }

  async create(shopId: number, vendorName: string) {
    const existing = await this.prisma.vendor.findFirst({ where: { shopId, vendorName } });
    if (existing) throw new ConflictException(`Vendor "${vendorName}" already exists`);
    return this.prisma.vendor.create({ data: { shopId, vendorName } });
  }

  async remove(shopId: number, id: number) {
    const v = await this.prisma.vendor.findFirst({ where: { id, shopId } });
    if (!v) throw new NotFoundException(`Vendor ${id} not found`);
    return this.prisma.vendor.delete({ where: { id } });
  }
}
