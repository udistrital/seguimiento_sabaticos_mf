import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioPlanTrabajo } from './formulario-plan-trabajo';

describe('FormularioPlanTrabajo', () => {
  let component: FormularioPlanTrabajo;
  let fixture: ComponentFixture<FormularioPlanTrabajo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioPlanTrabajo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioPlanTrabajo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
