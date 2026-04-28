import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialSabaticos } from './historial-sabaticos';

describe('HistorialSabaticos', () => {
  let component: HistorialSabaticos;
  let fixture: ComponentFixture<HistorialSabaticos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialSabaticos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialSabaticos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
