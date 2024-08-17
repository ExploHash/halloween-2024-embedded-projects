const int trigPin = 9;
const int echoPin = 10;
const int ledPin = 11;
const int flashDistance = 50;
enum State { FADING, FLASHING, WAITING };
State state = FADING;

// For the distance sensor
long duration, distance;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  switch (state) {
    case FADING:
      fadeAndMeasureLoop();
      break;
    case FLASHING:
      flashLoop();
      break;
    case WAITING:
      waitAndMeasureLoop();
      break;
  }
}

void flashLoop() {
  digitalWrite(ledPin, HIGH); // turn the LED on (HIGH is the voltage level)
  delay(100); // wait for a second
  digitalWrite(ledPin, LOW); // turn the LED off by making the voltage LOW
  delay(100); // wait for a second
  digitalWrite(ledPin, HIGH); // turn the LED on (HIGH is the voltage level)
  delay(100); // wait for a second
  digitalWrite(ledPin, LOW); // turn the LED off by making the voltage LOW
  delay(2000); // wait for a second
  state = WAITING;
}

void fadeAndMeasureLoop() {
  digitalWrite(ledPin, HIGH); // turn the LED on (HIGH is the voltage level)
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(ledPin, LOW); // turn the LED off by making the voltage LOW
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH);
  distance = (duration*.0343)/2;
  delay(100);

  if(distance < flashDistance) {
    state = FLASHING;
  }
}

void waitAndMeasureLoop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH);
  distance = (duration*.0343)/2;
  delay(100);

  if(distance > flashDistance) {
    state = FADING;
  }
}