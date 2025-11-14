import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreateInspectionDto } from './dto/create-inspection.dto';

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

    // ✅ ADICIONAR PARÂMETRO userEmail
    async createBulk(inspections: CreateInspectionDto[], userEmail: string) {
        const startTime = Date.now();
        this.logger.log(`Processing bulk insert of ${inspections.length} inspections for user: ${userEmail}`);

        // ✅ Adicionar email do usuário em TODAS as inspeções
        const validInspections = inspections.map(item => ({
            ...item,
            uploaded_by: userEmail, // ← FORÇAR o email do usuário autenticado
            data_proposta: item.data_proposta?.includes('undefined') ? null : item.data_proposta,
            data_atribuicao_empresa: item.data_atribuicao_empresa?.includes('undefined') ? null : item.data_atribuicao_empresa,
            data_atribuicao_inspetor: item.data_atribuicao_inspetor?.includes('undefined') ? null : item.data_atribuicao_inspetor,
        }));

        try {
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
                    this.logger.error(`Batch insert failed: ${error.message}`);
                    throw error;
                }

                totalInserted += data.length;
                results.push(...data);
            }

            const duration = Date.now() - startTime;
            this.logger.log(`Successfully inserted ${totalInserted} inspections in ${duration}ms`);

            return {
                success: true,
                count: totalInserted,
                data: results,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Failed to insert inspections after ${duration}ms`, error instanceof Error ? error.message : 'Unknown error');

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
}