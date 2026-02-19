import { TestBed } from '@angular/core/testing';

import { OpenAPIService } from '../services/open-api.service';

describe('OpenApiService', () => {
  let service: OpenAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
