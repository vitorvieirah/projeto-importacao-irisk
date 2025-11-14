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
@UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post('bulk')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
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

      // ✅ ADICIONAR EMAIL DO USUÁRIO EM CADA INSPEÇÃO
      const userEmail = req.user.email;
      
      if (!userEmail) {
        throw new HttpException(
          'Usuário não autenticado',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Passar o email do usuário para o service
      return await this.inspectionsService.createBulk(inspections, userEmail);
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