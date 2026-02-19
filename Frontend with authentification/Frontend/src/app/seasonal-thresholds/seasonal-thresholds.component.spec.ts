import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeasonalThresholdsComponent } from './seasonal-thresholds.component';

describe('SeasonalThresholdsComponent', () => {
  let component: SeasonalThresholdsComponent;
  let fixture: ComponentFixture<SeasonalThresholdsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeasonalThresholdsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeasonalThresholdsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
