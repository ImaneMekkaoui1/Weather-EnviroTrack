import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAlertsComponent } from './manage-alerts.component';

describe('ManageAlertsComponent', () => {
  let component: ManageAlertsComponent;
  let fixture: ComponentFixture<ManageAlertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAlertsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
