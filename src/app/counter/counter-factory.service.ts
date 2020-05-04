import { Injectable, OnDestroy } from '@angular/core';
import { merge, Observable, combineLatest, interval, NEVER } from 'rxjs';
import { mapTo, startWith, map, shareReplay, withLatestFrom, scan, switchMap } from 'rxjs/operators';
import { tag } from 'rxjs-spy/operators';

export interface CounterState {
    isTicking: boolean;
    count: number;
    countUp: boolean;
    tickSpeed: number;
    countDiff: number;
    startingValue: number;
}

export interface CounterInputs {
    countDiffChanges$: Observable<number>;
    down$: Observable<any>;
    pause$: Observable<any>;
    resetCounter$: Observable<any>;
    setToChanges$: Observable<number>;
    start$: Observable<any>;
    tickSpeedChanges$: Observable<number>;
    up$: Observable<any>;
}

type StepperFunc = (value: number) => number;

const increment = (countDiff: number) => (value: number) => value + countDiff;
const decrement = (countDiff: number) => (value: number) => value - countDiff;

export class Counter implements OnDestroy {

    count$: Observable<number>;
    countUp$: Observable<boolean>;
    countDiff$: Observable<number>;
    isTicking$: Observable<boolean>;
    setTo$: Observable<number>;
    startingValue$: Observable<number>;
    tickSpeed$: Observable<number>;
    vm$: Observable<CounterState>;

    constructor({
        countDiffChanges$, down$, pause$, resetCounter$, setToChanges$, start$, tickSpeedChanges$, up$ }: CounterInputs) {

        this.countDiff$ = this.createCountDiff$(countDiffChanges$);
        this.countUp$ = this.createCountUp$(down$, up$);
        this.isTicking$ = this.createIsTicking$(pause$, start$);
        this.setTo$ = this.createSetTo$(setToChanges$);
        this.tickSpeed$ = this.createTickspeed(tickSpeedChanges$);

        const ticker$ = this.createTicker$(this.isTicking$, this.tickSpeed$);
        const stepper$ = this.createStepper$(this.countUp$, this.countDiff$);
        const counter = this.createCounter(ticker$, stepper$);

        this.startingValue$ = this.createStartingValue$(this.setTo$, resetCounter$);
        this.count$ = this.startingValue$.pipe(switchMap(counter), tag('count'));

        this.vm$ = this.createViewModel$();
    }

    ngOnDestroy(): void {
        // do any cleanup here eg unsubscribing subscriptions
    }

    private createCounter(ticker$: Observable<number>, stepper$: Observable<StepperFunc>) {
        return (start: number) => ticker$.pipe(
            withLatestFrom(stepper$),
            map(([, stepper]) => stepper),
            scan<StepperFunc, number>((count, stepper) => stepper(count), start),
            startWith(start)
        );
    }

    private createCountDiff$(countDiffChanges$: Observable<number>) {
        return countDiffChanges$.pipe(
            startWith(1),
            tag('countDiff'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }

    private createIsTicking$(pause$: Observable<any>, start$: Observable<any>): Observable<boolean> {
        return merge(
            start$.pipe(mapTo(true)),
            pause$.pipe(mapTo(false))
        ).pipe(
            startWith(false),
            tag('isTicking'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }

    private createCountUp$(down$: Observable<any>, up$: Observable<any>): Observable<boolean> {
        return merge(
            up$.pipe(mapTo(true)),
            down$.pipe(mapTo(false))
        ).pipe(
            startWith(true),
            tag('countUp'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }

    private createStepper$(countUp$: Observable<boolean>, countDiff$: Observable<number>): Observable<StepperFunc> {
        return combineLatest([countUp$, countDiff$]).pipe(
            map(([up, countDiff]) => up ? increment(countDiff) : decrement(countDiff))
        );
    }

    private createSetTo$(setTo$: Observable<number>): Observable<number> {
        return setTo$.pipe(
            startWith(0),
            tag('setTo')
        );
    }

    private createStartingValue$(setTo$: Observable<number>, resetCounter$: Observable<any>): Observable<number> {
        return merge(
            setTo$,
            resetCounter$.pipe(mapTo(0))
        ).pipe(
            tag('startingValue'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }

    private createTicker$(isTicking$: Observable<boolean>, tickSpeed$: Observable<number>): Observable<number> {
        return combineLatest([isTicking$, tickSpeed$]).pipe(
            switchMap(([isTicking, tickSpeed]) => isTicking ? interval(tickSpeed) : NEVER)
        );
    }

    private createTickspeed(tickSpeedChanges$: Observable<number>): Observable<number> {
        return tickSpeedChanges$.pipe(
            startWith(200),
            tag('tickspeed'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }

    private createViewModel$(): Observable<CounterState> {
        return combineLatest([
            this.isTicking$,
            this.count$,
            this.countUp$,
            this.tickSpeed$,
            this.countDiff$,
            this.startingValue$
        ]).pipe(map(([isTicking, count, countUp, tickSpeed, countDiff, startingValue]) => ({
            isTicking,
            count,
            countUp,
            tickSpeed,
            countDiff,
            startingValue
        })),
            tag('viewModel'),
            shareReplay({ refCount: true, bufferSize: 1 })
        );
    }
}

/**
 * The reason we have this factory class rather than using `Counter` directly
 * is due to typescript strict null checks.
 * Typescript strict null checks require fields to be definitely assigned.
 * The alternative would be to consider supplying `CounterInputs` in
 * a `connect` method on the Counter class and removing the `Counter` constructor.
 * Doing so you would need to either assign `Counter` fields to default values that will
 * be replaced once `connect` is called or opt out of the null checks using `!` or
 * use rxjs `defer` function to delay the actual creation of the real observable
 * Each option has pros/cons
*/
@Injectable()
export class CounterFactoryService implements OnDestroy {

    private facade: OnDestroy | undefined;

    constructor() {
        // use angular DI here to inject services that are required by Counter class
    }

    get(inputs: CounterInputs): Counter {
        if (!this.facade) {
            this.facade = new Counter(inputs);
        }
        return this.facade as Counter;
    }

    ngOnDestroy(): void {
        if (this.facade) {
            this.facade.ngOnDestroy();
        }
    }
}
