import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private supabase;

    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('supabase.jwtSecret') ?? '',
        });

        this.supabase = createClient(
            this.configService.get<string>('supabase.url') ?? '',
            this.configService.get<string>('supabase.key') ?? '',
        );
    }

    async validate(payload: any) {
        // Verificar se o token é válido no Supabase
        const { data: { user }, error } = await this.supabase.auth.getUser(payload.sub);

        if (error || !user) {
            throw new UnauthorizedException('Invalid token');
        }

        return {
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
        };
    }
}