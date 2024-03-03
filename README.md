#  웹 오디오 편집기 (2023-02 ~ 2023-04)

<br>

<img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/37fed734-cdbb-4edd-bc44-f89ebae5582d" /><br>

### Web Audio API를 활용하여 VanillaJS로만 개발한 웹 오디오 편집기입니다.



<br>
<br>

# 제공 기능
기본적인 오디오 컷편집 및 트랙을 통하여 여러 오디오를 통합이 가능합니다.

<br>
<br>
<br>



# 💡 트러블 슈팅

## 1. 모든 Node가 오디오 버퍼를 가져 과도한 메모리 사용 문제

### 해결

오디오 버퍼를 직접 다루던 방식에서 편집된 오디오의 메타 데이터를 저장하고 원본 소스를 이용하여 새로운 오디오를 생성하는 방식으로 변경하여 **최대 `N` 배 만큼 메모리 사용률을 감소**시킴
<br>
<br>

### **실제 메모리 사용량 비교**

### **1. 같은 오디오 데이터를 20(N)개 복사하여 추가**

![오디오스무배.png](https://github.com/Yukicow/comiclub-pub/assets/106314016/6cafbe98-6e89-4c69-bbc1-af74e383f944)

<br>

### **2. 오디오 버퍼를 직접 다루는 방식의 메모리 사용량**

| 처음 오디오를 생성 후 메모리 사용량 | 20개 복사 후 메모리 사용량 비교 |
| :--- | :----------------------------------------------------------------------------------------------------- |
| <img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/dc5b1eab-384d-4a0c-9501-3ad3de123e94"  width="200" /> | <img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/ee884101-10fd-4871-b2e8-aa4930358e2c"  width="200" /> |

오디오 버퍼 외에 다른 데이터가 포함된 것을 감안하고 보면 **메모리 사용량이 약 20(`N`)배 증가**한 것을 볼 수 있다.

<br>

### **3. 메타 데이터를 사용하는 방식의 메모리 사용량 비교**

| 처음 오디오를 생성 후 메모리 사용량 | 20개 복사 후 메모리 사용량 비교 |
| :--- | :----------------------------------------------------------------------------------------------------- |
| <img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/0d0d362c-b486-4a0d-9615-47916034b369"  width="200" />| <img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/92badfab-3429-4121-be79-8ee8db5220cb"  width="200" /> |

처음 메모리 사용량과 크게 다르지 않은 모습을 볼 수 있다. 

최종적으로 **메모리 사용량이 최대 (N)배까지 감소**할 수 있다는 것이 확인되었다.

> 처음 오디오 생성 후 메모리 샤용량에 차이가 있는 이유는 위의 경우 `Undo` 를 위해서도 오디오 버퍼를 직접 저장하기 때문에 2배의 오디오 버퍼가 사용되기 때문이다.

<br>
<br>
<br>
<br>

## 2. 오디오 파장 출력이 느려지는 문제 해결

Canvas api에서 좌표 설정에 소수점을 사용할 경우 것이 `앤티 앨리어싱`(anti-aliasing) 처리를 위한 추가적인 연산으로 이어져 느려지는 현상.

### 해결

→  `44100Hz raw` 데이터를 나누는 블록 단위를 조정하여 초당 출력될 파장의 수를 줄이고 실수 대신 정수를 사용하여 오버헤드를 줄임. `GPU` 사용 시간이 크게 감소하여 **평균 출력 시간 1.2s 감소**
<br>
<br>

### **결과 비교**

### **1. 좌표 설정 실수 사용 + SamplePerSec(120) 조건으로 총 10번의 변화를 주었을 때 GPU 사용 시간 측정**

아래는 X좌표를 이동시키기 위해 사용되던 코드이고, `SamplePerSec`(=초당 움직이는 x 회수)은 120이다. 

```jsx
ctx.lineTo(
    x,
    canvasHeight -
        Math.floor(sample * canvasHeight * source.gainValue)
);
```
<br>
<img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/b26c0707-a1c5-432e-942d-2db00c1eed9b"  width="350" />

총 **13.75초**가 나온다. 10번의 시도였으니 **한 번의 출력 당 1.3초** 정도의 딜레이가 발생한다.

<br>
<br>
<br>

### **2. 좌표 설정 정수 사용 + `SamplePerSec`(120) 조건으로 10번의 변화를 주었을 때 GPU 사용 시간 측정**

**`앤티 앨리어싱`(anti-aliasing) 없애기**

```jsx
ctx.lineTo(
    Math.floor(x),
    canvasHeight -
        Math.floor(sample * canvasHeight * source.gainValue)
);
```
<br>

x좌표 설정에 실수가 사용되던 중이었는데 이를 Math.floor() 메소드를 사용해서 정수로 바꾸어 주었다.

<img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/31f5870a-7f1b-485e-bd80-ecb347511ade"  width="350" />

총 **2.7초**가 나온다. **한 번의 출력 당 0.27초** 정도의 딜레이가 발생한다.

평균적으로 **1초 만큼 출력 시간이 감소**한 것이다.

<br>
<br>
<br>

### **3. 좌표 설정 정수 사용 + SamplePerSec(30) 조건으로 10번의 변화를 주었을 때 GPU 사용 시간 측정**

조금 더 개선의 여지가 있지 않을까 싶어 `SamplePerSec`을 낮춰 보기로 했다.

낮추었을 때의 파장과 그 전의 파장이 보여지는 차이가 크지 않아서 성능적으로 이득이 있다면 낮출 가치가 있다고 판단했다.
<br>
<img src="https://github.com/Yukicow/comiclub-pub/assets/106314016/96ac8931-60f4-499a-a5ce-8560f6fad480"  width="350" />

총 **1.2초**가 나온다. **한 번의 출력 당 0.12초** 정도의 딜레이가 발생한다. 

**GPU 사용 시간이 약 2배의 줄어들었다.** 물론 GPU 사용량에만 영향을 주고 스크립트 실행 시간에는 유의미한 변화는 없었다.

> 오히려 스크립트 실행 시간은 길어지기도 했기 때문에 실제 2배 만큼의 성능 개선 효과가 있지는 않았다고 볼 수 있다.
<br>
<br>

**최종적으로 `GPU` 사용 시간이 평균 1.3초에서 0.12초로 감소하여 1.2초 정도 개선된 것을 확인할 수 있다.**


<br>
<br>
<br>

## 3. 재생 버튼 클릭 시마다 오디오 재생 지연 문제

### 해결

재생 버튼을 클릭할 때마다 새롭게 오디오를 생성하지 않고, **기존에 만들어진 오디오 버퍼를 재사용**하도록 변경.

메모리를 조금 사용하게 되는 트레이드 오프가 발생하지만 최초 재생 이후 지연 없이 오디오 재생이 가능하여 사용자 경험이 크게 향상됨

<br>
<br>
<br>
<br>
