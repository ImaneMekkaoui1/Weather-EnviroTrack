import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSensorsComponent } from './manage-sensors.component';

describe('ManageSensorsComponent', () => {
  let component: ManageSensorsComponent;
  let fixture: ComponentFixture<ManageSensorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageSensorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageSensorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
