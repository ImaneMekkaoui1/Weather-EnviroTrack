import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcpZoneComponent } from './ocp-zone.component';

describe('OcpZoneComponent', () => {
  let component: OcpZoneComponent;
  let fixture: ComponentFixture<OcpZoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OcpZoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcpZoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
