import { Component, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { create } from 'rxjs-spy';
import { map } from 'rxjs/internal/operators/map';
import { distinctUntilChanged, first, pluck, switchMap } from 'rxjs/operators';
import { Counter, CounterFactoryService, CounterState } from './counter-factory.service';

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

function pick<T>(key: keyof T) {
  return (source$: Observable<T>) => source$.pipe(
    pluck(key),
    distinctUntilChanged(),
    map(value => ({ [key]: value }))
  );
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

  countUpChanges = new Subject<boolean>();
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
      countDiffChanges$: this.counterForm.controls.countDiff.valueChanges.pipe(map(v => +v)),
      countUpChanges$: this.countUpChanges,
      pause$: this.btnPause,
      resetCounter$: this.btnReset,
      setToChanges$: this.btnSetTo.pipe(map(() => +this.counterForm.controls.startingValue.value)),
      start$: this.btnStart,
      tickSpeedChanges$: this.counterForm.controls.tickSpeed.valueChanges.pipe(map(v => +v))
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
      counter.vm$.pipe(pick('countDiff')),
      counter.vm$.pipe(pick('tickSpeed')),
      counter.vm$.pipe(pick('startingValue')),
      // startingValue might not have changed, yet setTo input element might have been typed into
      // and therefore needs synchronizing with the CounterState
      this.btnReset.pipe(switchMap(() => counter.vm$.pipe(pick('startingValue'), first())))
    );
  }
}
