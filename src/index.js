// fromEvent - позволяет создавать стримы из различныз событий
import {fromEvent} from 'rxjs'
import {map, pairwise, switchMap, takeUntil, withLatestFrom, startWith} from 'rxjs/operators'

const canvas = document.querySelector('canvas')
const range = document.getElementById('range')
const color = document.getElementById('color')

// getContext() - возвращает контекст рисования на холсте
const ctx = canvas.getContext('2d')

// getBoundingClientRect() - возвращает размер холста и его координаты
const rect = canvas.getBoundingClientRect()

// devicePixelRatio - содержит отношение разрешения дисплея текущего устройства в физических пикселях к разрешению в логических (CSS) пикселях (доступно только для чтения)  
const scale = window.devicePixelRatio

// Задаем размеры холста
canvas.width = rect.width * scale
canvas.height = rect.height * scale
ctx.scale(scale, scale)

// Создание стримов при возникновении событий мыши на холсте
const mouseMove$ = fromEvent(canvas, 'mousemove')
const mouseDown$ = fromEvent(canvas, 'mousedown')
const mouseUp$ = fromEvent(canvas, 'mouseup')
const mouseOut$ = fromEvent(canvas, 'mouseout')

function createInputStream(node) {
  return fromEvent(node, 'input')
    .pipe(
			map(e => e.target.value),
			
			// startWith() - позволяет задавать начальное значение для стрима
      startWith(node.value)
    )
}

const lineWidth$ = createInputStream(range)
const strokeStyle$ = createInputStream(color)

const stream$ = mouseDown$
	.pipe(

		// Перед тем как мы произведем клик по холсту, нам необходимо совместить значения, которые находятся в стриме lineWidth$ и strokeStyle$, с значением стрима mouseDown$. Это можно сделать с помощью withLatestFrom().
		// withLatestFrom() - позволяет получить значения из множества стримов и совмещает их в новый формат. Где:
		// lineWidth$, strokeStyle$ - из каких стримов получаем данные
		// (_, lineWidth, strokeStyle):
		//  - первый параметр _ - данные из стрима mouseDown$, которые мы игнорируем с помощью _
		// - второй параметр lineWidth - данные из стрима lineWidth$
		// - третий параметр strokeStyle - данные из стрима strokeStyle$
		withLatestFrom(lineWidth$, strokeStyle$, (_, lineWidth, strokeStyle) => {
			console.log({
				lineWidth, 
				strokeStyle
			});
      return {
				lineWidth, 
				strokeStyle
			}
		}),
		
		// Когда произошел стрим mouseDown, нам необходимо переключиться на стрим mouseMove, чтобы была возможность рисовать.
		// Для этого используем switchMap() - позволяет переключиться на другой стрим
		switchMap((options ) => {
			return mouseMove$
				.pipe(
					map(event => ({
						x: event.offsetX,
						y: event.offsetY,
						myOptions: options 
					})),
			
					// pairwise() - возвращает массив с текущим и предыдущим значением последовательности.
					// В нашем случаи subscribe будет получать такой массив:
					// [
					//   {x: 425, y: 70},
					//   {x: 427, y: 74}
					// ]
					pairwise(),

					// Чтобы при возникновении mouseup не было возможности рисовать - используем takeUntil()
					// takeUntil() - будет получать значения из стрима mouseMove$, пока не произойдет другой стрим - mouseUp$
					takeUntil(mouseUp$),

					// takeUntil() - будет получать значения из стрима mouseMove$, пока не произойдет другой стрим - mouseOut$
					takeUntil(mouseOut$),
				)
		}),

	)

// subscribe принимает массив, где с помощью деструктиризации первое значение массива пойдёт в переменную from, второе - в to
stream$.subscribe(([from, to]) => {
	console.log('myOptions', from);
	const {lineWidth, strokeStyle} = from.myOptions

	ctx.lineWidth = lineWidth
  ctx.strokeStyle = strokeStyle

	ctx.beginPath()
	ctx.moveTo(from.x, from.y)
	ctx.lineTo(to.x, to.y)
	ctx.stroke()
})
