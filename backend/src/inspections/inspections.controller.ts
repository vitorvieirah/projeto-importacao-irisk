import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inspections')
@UseGuards(JwtAuthGuard) // Proteger todas as rotas
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post('bulk')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 uploads por minuto
  async createBulk(
    @Body() inspections: CreateInspectionDto[],
    @Request() req: any,
  ) {
    try {
      // Validações
      if (!Array.isArray(inspections) || inspections.length === 0) {
        throw new HttpException(
          'Dados inválidos: array vazio',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (inspections.length > 10000) {
        throw new HttpException(
          'Máximo de 10.000 registros por upload',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Adicionar informações do usuário autenticado
      const inspectionsWithUser = inspections.map(inspection => ({
        ...inspection,
        uploaded_by: req.user.email, // Email do usuário autenticado
      }));

      return await this.inspectionsService.createBulk(inspectionsWithUser);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao processar inspeções',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.inspectionsService.findAll(req.user.email);
  }
}