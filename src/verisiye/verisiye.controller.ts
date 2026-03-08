import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req,
} from '@nestjs/common';
import { VerisiyeService } from './verisiye.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Base route: /shops/:shopId/verisiye
 *
 * Portal (public login, then customer-scoped):
 *   POST /shops/:shopId/verisiye/portal/login   → customer login (homeNo + telNo)
 *   GET  /shops/:shopId/verisiye/portal/me      → customer views their own data
 *
 * Customers (shop staff/owner):
 *   GET    /shops/:shopId/verisiye/customers
 *   POST   /shops/:shopId/verisiye/customers
 *   GET    /shops/:shopId/verisiye/customers/:id
 *   PATCH  /shops/:shopId/verisiye/customers/:id
 *   DELETE /shops/:shopId/verisiye/customers/:id
 *   GET    /shops/:shopId/verisiye/customers/:id/detail
 *
 * Payments:
 *   POST   /shops/:shopId/verisiye/payments
 */
@Roles('OWNER', 'STAFF')
@Controller('shops/:shopId/verisiye')
export class VerisiyeController {
  constructor(private readonly verisiyeService: VerisiyeService) {}

  // ── Portal ──────────────────────────────────────────────────

  @Public()
  @Post('portal/login')
  portalLogin(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() body: { homeNo: string; telNo: string },
  ) {
    return this.verisiyeService.portalLogin(shopId, body.homeNo, body.telNo);
  }

  @Roles('CUSTOMER')
  @Get('portal/me')
  getPortalMe(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Req() req: any,
  ) {
    const customerId: number = req.user?.sub;
    return this.verisiyeService.getMyPortalData(shopId, customerId);
  }

  // ── Customers ───────────────────────────────────────────────

  @Get('customers')
  findAllCustomers(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.verisiyeService.findAllCustomers(shopId);
  }

  @Post('customers')
  createCustomer(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.verisiyeService.createCustomer(shopId, dto);
  }

  @Get('customers/:id/detail')
  getCustomerDetail(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.verisiyeService.getCustomerDetail(shopId, id);
  }

  @Get('customers/:id')
  findOneCustomer(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.verisiyeService.findOneCustomer(shopId, id);
  }

  @Patch('customers/:id')
  @Roles('OWNER')
  updateCustomer(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCustomerDto>,
  ) {
    return this.verisiyeService.updateCustomer(shopId, id, dto);
  }

  @Delete('customers/:id')
  @Roles('OWNER')
  deactivateCustomer(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.verisiyeService.deactivateCustomer(shopId, id);
  }

  // ── Payments ────────────────────────────────────────────────

  @Post('payments')
  createPayment(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.verisiyeService.createPayment(shopId, dto);
  }
}
