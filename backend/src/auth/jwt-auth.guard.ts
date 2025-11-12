import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private supabase;

    constructor(private configService: ConfigService) {
        super();
        this.supabase = createClient(
            this.configService.get<string>('supabase.url') ?? '',
            this.configService.get<string>('supabase.key') ?? '',
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const { data: { user }, error } = await this.supabase.auth.getUser(token);

            if (error || !user) {
                throw new UnauthorizedException('Invalid token');
            }

            request.user = {
                userId: user.id,
                email: user.email,
                role: user.role || 'user',
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}