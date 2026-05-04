FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -DskipTests clean package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
COPY --from=build /app/target/kituirides-api-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads app.jar
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget --spider -q http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java","-Xmx512m","-Xms256m","-jar","app.jar"]
