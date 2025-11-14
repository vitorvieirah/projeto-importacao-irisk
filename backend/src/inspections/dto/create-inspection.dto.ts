import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsDateString, 
  MaxLength, 
  Matches,
  Min,
  Max,
  IsNotEmpty
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInspectionDto {
  @IsString()
  @IsNotEmpty({ message: 'Número da inspeção é obrigatório' })
  @MaxLength(50)
  @Matches(/^[0-9]+$/, { message: 'Nr. Inspeção deve conter apenas números' })
  nr_inspecao: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nr_sinistro?: string | null;

  @IsDateString({}, { message: 'Data de inclusão inválida' })
  @IsOptional()
  data_inclusao?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[A-Za-zÀ-ÿ0-9\s\-]+$/, { message: 'Prioridade contém caracteres inválidos' })
  prioridade?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  empresa_inspecao?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  base_empresa?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  inspetor?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  operador?: string | null;

  @IsDateString()
  @IsOptional()
  agendamento?: string | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999)
  dias_cia_previa?: number | null;

  @IsDateString()
  @IsOptional()
  data_proposta?: string | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999)
  dias_inspecao?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999)
  dias_inspetor?: number | null;

  @IsDateString()
  @IsOptional()
  data_atribuicao_empresa?: string | null;

  @IsDateString()
  @IsOptional()
  data_atribuicao_inspetor?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  enquadramento?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  categoria?: string | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999.99)
  lmg?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  segurado?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tipo_seguro?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  endereco?: string | null;

  @IsDateString()
  @IsOptional()
  data_ultima_atividade?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  atividade_atual?: string | null;

  @IsDateString()
  @IsOptional()
  ultima_tarefa?: string | null;
}