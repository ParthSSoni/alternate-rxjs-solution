import { Component } from '@angular/core';
import { Subject, merge, interval, NEVER, Observable, combineLatest, BehaviorSubject, concat } from 'rxjs';
import { mapTo, switchMap, startWith, scan, map, withLatestFrom, take, share, shareReplay } from 'rxjs/operators';

interface CounterState {
  isTicking: boolean;
  count: number;
  countUp: boolean;
  tickSpeed: number;
  countDiff: number;
}

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

type StepperFunc = (value: number) => number;

const increment = (countDiff: number) => (value: number) => value + countDiff;
const decrement = (countDiff: number) => (value: number) => value - countDiff;


@Component({
  selector: 'app-counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.scss']
})
export class CounterComponent {
  elementIds = ElementIds;

  btnUp = new Subject<Event>();
  btnDown = new Subject<Event>();
  btnStart = new Subject<Event>();
  btnPause = new Subject<Event>();
  btnSetTo = new Subject<Event>();
  btnReset = new Subject<Event>();
  inputSetTo = new BehaviorSubject<number>(0);
  inputTicketSpeed = new BehaviorSubject<number>(200);
  inputCountDiff = new BehaviorSubject<number>(1);

  count = 0;
  vm$: Observable<CounterState & { startingValue: number }>;

  constructor() {

    const countUp$ = merge(
      this.btnUp.pipe(mapTo(true)),
      this.btnDown.pipe(mapTo(false))
    ).pipe(
      startWith(true)
    );

    const stepper$ = combineLatest(countUp$, this.inputCountDiff).pipe(
      map(([up, countDiff]) => up ? increment(countDiff) : decrement(countDiff))
    );

    const isTicking$ = merge(
      this.btnStart.pipe(mapTo(true)),
      this.btnPause.pipe(mapTo(false))
    ).pipe(
      startWith(false),
      shareReplay(1)
    );

    const setTo$ = concat(
      this.inputSetTo.pipe(take(1)),
      this.btnSetTo.pipe(
        withLatestFrom(this.inputSetTo),
        map(([, setTo]) => setTo)
      )
    );

    const counterStarting$ = merge(
      setTo$,
      this.btnReset.pipe(mapTo(0))
    );

    const ticker$ = combineLatest(isTicking$, this.inputTicketSpeed).pipe(
      switchMap(([isTicking, tickSpeed]) => isTicking ? interval(tickSpeed) : NEVER)
    );

    const counter = (start: number) => ticker$.pipe(
      withLatestFrom(stepper$),
      map(([, stepper]) => stepper),
      scan<StepperFunc, number>((count, stepper) => stepper(count), start),
      startWith(start)
    );

    const count$ = counterStarting$.pipe(switchMap(counter));

    this.vm$ = combineLatest(isTicking$, count$, countUp$, this.inputTicketSpeed, this.inputCountDiff, counterStarting$).pipe(
      map(([isTicking, count, countUp, tickSpeed, countDiff, startingValue]) => ({
        isTicking,
        count,
        countUp,
        tickSpeed,
        countDiff,
        startingValue
      }))
    );
  }

  getInputValue = (event: HTMLInputElement): number => {
    return parseInt(event['target'].value, 10);
  }

}
