pipeline {
    agent {
        docker {
            image 'node:18.20.8-alpine'
            args  '--network ci-net'
        }
    }

    environment {
        APP_NAME         = 'kijanikiosk-payments'
        NODE_ENV         = 'test'
        BUILD_DIR        = 'dist'
        NEXUS_REGISTRY   = 'http://nexus:8081/repository/npm-kijanikiosk/'
        NEXUS_BROWSE_URL = 'http://localhost:8081/repository/npm-kijanikiosk/'
        npm_config_cache = "${WORKSPACE}/.npm"
        npm_config_update_notifier = 'false'
        npm_config_fund  = 'false'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        // Dependencies are installed here because lint needs eslint,
        // and lint must run first (fail-fast).
        stage('Lint') {
            steps {
                sh '''
                    npm ci
                    npm run lint
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    npm run build
                    test -d "${BUILD_DIR}"
                    [ -n "$(ls -A "${BUILD_DIR}")" ]
                    echo "Build output: $(ls "${BUILD_DIR}" | wc -l) files in ${BUILD_DIR}/"
                '''
            }
        }

        stage('Verify') {
            parallel {
                stage('Test') {
                    steps {
                        sh 'npm test'
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'test-results/*.xml'
                        }
                    }
                }
                stage('Security Audit') {
                    steps {
                        sh 'npm audit --omit=dev --audit-level=high'
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: "${BUILD_DIR}/**",
                                 fingerprint: true,
                                 onlyIfSuccessful: true
            }
        }

        stage('Publish') {
            steps {
                script {
                    env.PKG_VERSION = sh(
                        script: "node -p \"require('./package.json').version\"",
                        returnStdout: true
                    ).trim()
                    env.ARTIFACT_VERSION = "${env.PKG_VERSION}-${env.GIT_COMMIT.substring(0, 7)}"
                }
                echo "Publishing ${APP_NAME} version ${env.ARTIFACT_VERSION}"
                withCredentials([usernamePassword(
                    credentialsId: 'nexus-credentials',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASS'
                )]) {
                    sh '''
                        set +x
                        set -e
                        WORK="$(mktemp -d)"
                        cp -r "${BUILD_DIR}" package.json "${WORK}/"
                        cd "${WORK}"
                        trap 'rm -f "${WORK}/.npmrc"' EXIT
                        npm pkg set version="${ARTIFACT_VERSION}"
                        REG_PATH="${NEXUS_REGISTRY#http:}"
                        AUTH="$(printf '%s' "${NEXUS_USER}:${NEXUS_PASS}" | base64 | tr -d '[:space:]')"
                        echo "registry=${NEXUS_REGISTRY}" > .npmrc
                        echo "${REG_PATH}:_auth=${AUTH}" >> .npmrc
                        npm publish
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "SUCCESS: published ${APP_NAME} ${env.ARTIFACT_VERSION}"
            echo "Artifact URL: ${NEXUS_BROWSE_URL}${APP_NAME}/-/${APP_NAME}-${env.ARTIFACT_VERSION}.tgz"
        }
        failure {
            echo "FAILED: ${APP_NAME} build #${BUILD_NUMBER} - ${BUILD_URL}console"
        }
        changed {
            echo "STATUS CHANGED to ${currentBuild.currentResult}: ${JOB_NAME} #${BUILD_NUMBER}"
        }
        always {
            cleanWs()
        }
    }
}
