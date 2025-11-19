import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreateInspectionDto } from './dto/create-inspection.dto';

export interface DuplicateInfo {
    nr_inspecao: string;
    existing_id: string;
}

export interface BulkInsertResult {
    success: boolean;
    count: number;
    inserted: number;
    duplicates: number;
    duplicateList?: DuplicateInfo[];
    data: any[];
}

@Injectable()
export class InspectionsService {
    private supabase: SupabaseClient;
    private readonly logger = new Logger(InspectionsService.name);

    constructor(private configService: ConfigService) {
        const url = this.configService.get<string>('supabase.url');
        const key = this.configService.get<string>('supabase.key');

        if (!url || !key) {
            throw new Error('Supabase credentials not configured');
        }

        this.logger.log('Supabase client initialized');
        this.supabase = createClient(url, key);
    }

    async createBulk(inspections: CreateInspectionDto[], userEmail: string): Promise<BulkInsertResult> {
        const startTime = Date.now();
        this.logger.log(`Processing bulk insert of ${inspections.length} inspections for user: ${userEmail}`);

        // ✅ 1. VERIFICAR DUPLICATAS NO BANCO DE DADOS
        const nrInspecoes = inspections
            .map(i => i.nr_inspecao)
            .filter((nr, index, self) => nr && self.indexOf(nr) === index); // Remove duplicatas no array

        const { data: existingInspections, error: checkError } = await this.supabase
            .from('irisk_inspecoes')
            .select('nr_inspecao, id')
            .in('nr_inspecao', nrInspecoes)
            .eq('uploaded_by', userEmail); // Se usar unicidade por usuário

        if (checkError) {
            this.logger.error('Error checking duplicates:', checkError.message);
            throw new HttpException(
                'Erro ao verificar duplicatas',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // Criar mapa de inspeções existentes
        const existingMap = new Map(
            (existingInspections || []).map(item => [item.nr_inspecao, item.id])
        );

        // ✅ 2. FILTRAR APENAS INSPEÇÕES NOVAS
        const newInspections = inspections.filter(
            item => !existingMap.has(item.nr_inspecao)
        );

        const duplicatesInfo: DuplicateInfo[] = inspections
            .filter(item => existingMap.has(item.nr_inspecao))
            .map(item => ({
                nr_inspecao: item.nr_inspecao,
                existing_id: existingMap.get(item.nr_inspecao) || '',
            }));

        this.logger.log(`Found ${duplicatesInfo.length} duplicates, inserting ${newInspections.length} new inspections`);

        // Se não há nada para inserir
        if (newInspections.length === 0) {
            return {
                success: true,
                count: 0,
                inserted: 0,
                duplicates: duplicatesInfo.length,
                duplicateList: duplicatesInfo,
                data: [],
            };
        }

        // ✅ 3. PREPARAR DADOS PARA INSERÇÃO
        const validInspections = newInspections.map(item => ({
            ...item,
            uploaded_by: userEmail,
            data_proposta: item.data_proposta?.includes('undefined') ? null : item.data_proposta,
            data_atribuicao_empresa: item.data_atribuicao_empresa?.includes('undefined') ? null : item.data_atribuicao_empresa,
            data_atribuicao_inspetor: item.data_atribuicao_inspetor?.includes('undefined') ? null : item.data_atribuicao_inspetor,
        }));

        try {
            // ✅ 4. INSERIR EM BATCHES
            const batchSize = 1000;
            const batches: any[] = [];
            const results: any[] = [];

            for (let i = 0; i < validInspections.length; i += batchSize) {
                batches.push(validInspections.slice(i, i + batchSize));
            }

            let totalInserted = 0;

            for (const batch of batches) {
                const { data, error } = await this.supabase
                    .from('irisk_inspecoes')
                    .insert(batch)
                    .select();

                if (error) {
                    // Se for erro de duplicata (mesmo com verificação prévia)
                    if (error.code === '23505') { // PostgreSQL unique violation
                        this.logger.warn(`Duplicate key violation during insert, skipping batch`);
                        continue; // Pular este batch
                    }
                    
                    this.logger.error(`Batch insert failed: ${error.message}`);
                    throw error;
                }

                totalInserted += data.length;
                results.push(...data);
            }

            const duration = Date.now() - startTime;
            this.logger.log(`Successfully inserted ${totalInserted} inspections in ${duration}ms (${duplicatesInfo.length} duplicates skipped)`);

            return {
                success: true,
                count: totalInserted,
                inserted: totalInserted,
                duplicates: duplicatesInfo.length,
                duplicateList: duplicatesInfo.length > 0 ? duplicatesInfo : undefined,
                data: results,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(
                `Failed to insert inspections after ${duration}ms`,
                error instanceof Error ? error.message : 'Unknown error'
            );

            throw new HttpException(
                'Erro ao inserir inspeções no banco de dados',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findAll(userEmail: string) {
        this.logger.log(`Fetching inspections for user: ${userEmail}`);

        const { data, error } = await this.supabase
            .from('irisk_inspecoes')
            .select('*')
            .eq('uploaded_by', userEmail)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            this.logger.error('Failed to fetch inspections', error.message);
            throw new HttpException(
                'Erro ao buscar inspeções',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return data;
    }

    // ✅ NOVO: Verificar se uma inspeção existe
    async checkExists(nrInspecao: string, userEmail: string): Promise<boolean> {
        const { data, error } = await this.supabase
            .from('irisk_inspecoes')
            .select('id')
            .eq('nr_inspecao', nrInspecao)
            .eq('uploaded_by', userEmail)
            .single();

        return !error && !!data;
    }
}