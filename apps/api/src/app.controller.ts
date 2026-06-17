import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { AppService } from './app.service';

@Controller('health')
@Public()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
