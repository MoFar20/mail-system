import com.github.gradle.node.npm.task.NpmTask

plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    id("org.springframework.boot") version "4.0.0"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("plugin.jpa") version "2.2.21"
    id("com.github.node-gradle.node") version "7.1.0"
}

group = "de.thm.mni.GraphQL"
version = "0.0.1-SNAPSHOT"
description = "mail-system"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

node {
    version.set("22.11.0")
    download.set(true)
    nodeProjectDir.set(file("${project.projectDir}/mail-client"))
}

dependencies {
    implementation("org.springframework.boot:spring-boot-h2console")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.3")
    runtimeOnly("com.h2database:h2")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    implementation("com.bucket4j:bucket4j-core:8.10.1")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// ── Frontend build & Spring Boot Integration ──────────────────────────────────

tasks.register<NpmTask>("buildAngular") {
    description = "Builds the Angular frontend with 'npm run build'."
    dependsOn("npmInstall")
    args.set(listOf("run", "build"))
    inputs.dir("${project.projectDir}/mail-client/src")
    inputs.file("${project.projectDir}/mail-client/package.json")
    inputs.file("${project.projectDir}/mail-client/angular.json")
    inputs.file("${project.projectDir}/mail-client/tsconfig.json")
    outputs.dir("${project.projectDir}/mail-client/dist")
}

// Integrate Angular build output directly into Spring Boot's resource processing
tasks.named<ProcessResources>("processResources") {
    dependsOn("buildAngular")
    from("${project.projectDir}/mail-client/dist/mail-client/browser") {
        into("static")
    }
}