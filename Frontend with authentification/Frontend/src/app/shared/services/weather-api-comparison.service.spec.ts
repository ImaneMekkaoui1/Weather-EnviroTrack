import { TestBed } from '@angular/core/testing';

import { WeatherApiComparisonService } from './weather-api-comparison.service';

describe('WeatherApiComparisonService', () => {
  let service: WeatherApiComparisonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeatherApiComparisonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
