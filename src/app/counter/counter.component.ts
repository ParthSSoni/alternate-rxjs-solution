import { Component, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { create } from 'rxjs-spy';
import { map } from 'rxjs/internal/operators/map';
import { distinctUntilChanged } from 'rxjs/operators';
import { CounterFactoryService, CounterState, Counter } from './counter-factory.service';

enum ElementIds {
  TimerDisplay = 'timer-display',
  BtnStart = 'btn-start',
  BtnPause = 'btn-pause',
  BtnUp = 'btn-up',
  BtnDown = 'btn-down',
  BtnReset = 'btn-reset',
  BtnSetTo = 'btn-set-to',
  InputSetTo = 'input-set-to',
  InputTickSpeed = 'input-tick-speed',
  InputCountDiff = 'input-count-diff'
}

@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.scss'],
  providers: [
    CounterFactoryService
  ]
})
export class CounterComponent implements OnDestroy {
  elementIds = ElementIds;

  btnUp = new Subject<Event>();
  btnDown = new Subject<Event>();
  btnStart = new Subject<Event>();
  btnPause = new Subject<Event>();
  btnSetTo = new Subject<Event>();
  btnReset = new Subject<Event>();

  counterForm = this.fb.group({
    tickSpeed: [],
    startingValue: [],
    countDiff: []
  });
  subs = new Subscription();
  vm$: Observable<CounterState>;

  constructor(counterFactory: CounterFactoryService, private fb: FormBuilder) {

    // enable rxjs-spy
    // WARNING: in a production app, don't call `create` in code, but use chrome dev tools
    // (see main.ts for how we've setup rxjs-spy on the global window object)
    const spy = create();
    spy.log();

    const counter = counterFactory.get({
      countDiffChanges$: this.counterForm.controls.countDiff.valueChanges.pipe(this.parseNumber()),
      down$: this.btnDown,
      pause$: this.btnPause,
      resetCounter$: this.btnReset,
      setToChanges$: this.btnSetTo.pipe(map(() => +this.counterForm.controls.startingValue.value)),
      start$: this.btnStart,
      tickSpeedChanges$: this.counterForm.controls.tickSpeed.valueChanges.pipe(this.parseNumber()),
      up$: this.btnUp
    });


    const formStateChanges$ = this.createFormStateChanges$(counter);

    this.subs.add(formStateChanges$.subscribe(value => {
      this.counterForm.patchValue(value, { emitEvent: false });
    }));

    this.vm$ = counter.vm$;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private createFormStateChanges$(counter: Counter) {
    return merge(
      counter.countDiff$.pipe(
        distinctUntilChanged(),
        map(countDiff => ({ countDiff }))
      ),
      counter.tickSpeed$.pipe(
        distinctUntilChanged(),
        map(tickSpeed => ({ tickSpeed }))
      ),
      counter.startingValue$.pipe(
        distinctUntilChanged(),
        map(startingValue => ({ startingValue }))
      )
    );
  }

  private parseNumber() {
    return (source$: Observable<string>) => source$.pipe(map(v => +v));
  }
}
