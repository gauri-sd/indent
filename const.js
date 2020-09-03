 import groovy.json.*

        @NonCPS
        def parseJsonText(String jsonText) {
            final slurper = new JsonSlurper()
            return new HashMap<>(slurper.parseText(jsonText))
        }
       
        node ("jenkinsSlave") {
          /*
          Portfolio Project Details
          */
          def PortfolioProjectId = '1599053125167'
  
          /*
          Configurations within Manage Jenkins
          */
          def JiraSite = 'IRO-JIRA';
          def SonarEnv = 'IRO-Sonar';
          def GitCredentialsId = 'gitlab-cred';
          def GitUserName = 'root';
          def GitUserPassword = 'iauro100';
  
          /*
          Gitlab Project related information
          */
          def GitUrl = 'https://ops-gitlab.iauro.co/aurops-staging/ex-jenkins-svc3.git';
          def RepoUrl = 'aurops-staging/ex-jenkins-svc3';
  
  
          def GitUrlWithPassword = 'https://'+GitUserName+':'+GitUserPassword+'@ops-gitlab.iauro.co/aurops-staging/ex-jenkins-svc3.git';
  
          /*
          Gitlab Deploy Project related information
          */
          def DeployGitUrl = 'https://ops-gitlab.iauro.co/aurops-staging/ex-jenkins-svc3-deploy.git';
          def DeployRepoUrl = 'aurops-staging/ex-jenkins-svc3-deploy';
  
          def pipeline_name = '1599053125167_EJ03HCA'
  
  
          /*
          Jira Project related information
          JiraIssueKey is...
          1. Branch name in case of developer pipeline
          2. Key of issue created for Merge Request
          3. Empty string in case of scheduled builds
  
          JiraIssueType requires when creating an issue for merge request. Otherwise it can be empty.
          */
          def JiraIssueKey = 'development'; // Branch name in case of developer and merge pipelines
          def JiraProjectKey = 'EJ0GE2V';
          def JiraIssueType = '10002';
  
  
          /*
          Variables applicable when it is scheduled pipeline
          */
          def IsScheduled = true;
          def JiraIssueAssignee = '557058:f0204e93-d58b-4bfd-8313-d90910e9f0ac'
  
          /*
          Configurations related to zap
          */
          def urlToTest = 'https://ops.iauro.co/ex-jenkins-svc3-'+DeployEnvironment.toLowerCase();
          def path = '1599053125167_EJ03HCA.html';
          def outputURL = 'https://ops.iauro.co/zap/1599053125167_EJ03HCA.html';
  
          /*
          Configurations related to RMM
          */
          def swaggerURL = 'https://ops.iauro.co/ex-jenkins-svc3-'+DeployEnvironment.toLowerCase()+'/swagger.json'
  
          /*
          Strings to be configured
          */
          def CheckoutIssuePrefix = 'Jenkins Pipeline Issue in Checkout stage: ';
          def BuildIssuePrefix = 'Jenkins Pipeline Issue in Build stage: ';
          def UnitTestIssuePrefix = 'Jenkins Pipeline Issue in Unit Test stage: ';
          def SonarAnalysisIssuePrefix = 'Jenkins Pipeline Issue in Sonar Analysis stage: ';
          def QualityGateIssuePrefix = 'Jenkins Pipeline Quality Gate error: ';
          def DeploySuccessfull = 'Jenkins Pipeline Success: Deployed successfully ';
          def MergeRequestIssuePrefix = 'Jenkins Pipeline Issue in Merge Request stage: ';
  
          def commit = ''
  
          def uiendpoint = 'ex-jenkins-svc3-'+DeployEnvironment.toLowerCase();
  
           
   
    stage('Checkout') {
    echo 'Cloning code..'
    try{
    git url: GitUrl, credentialsId: GitCredentialsId, branch: GitBranch
    } catch (Exception e) {
     if(IsScheduled){
    def testIssue = [fields: [ project: [key: JiraProjectKey],
    summary: CheckoutIssuePrefix+e.getMessage(),
    description: CheckoutIssuePrefix+e.getMessage(),
    issuetype: [id: JiraIssueType],
    assignee: [accountId: JiraIssueAssignee]]],
    response = jiraNewIssue issue: testIssue, site: JiraSite
    }else{
    jiraAddComment comment: CheckoutIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
    }
    echo('Exception: '+e.class.name)
    error('Exception: '+e.getMessage())
    }
    }
   
              stage('DB Deploy') {
                  echo 'DB Deploy Initiated...'
                  try {
                      def configJSONData = readFile('database/config.json').trim()
                      if (configJSONData != '') {
                          def slurped = parseJsonText(configJSONData)
                          def db_url = slurped.url
                          def database_engine = slurped.db_engine
                          sh "liquibase --changeLogFile='database/deploy/liquibase.xml' --driver='" + slurped.driver + "' --classpath='" + slurped.classpath + "' --url='"+ db_url + "' --username='" + slurped.username + "' --password='" + slurped.password + "' update"
                      }
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'Liquibase Deploy Stage error while running ' + pipeline_name + ' pipeline',
                          description: BuildIssuePrefix+e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      error('Exception: '+e.getMessage())
                  }
              }
   
              stage('DB Verify') {
                  echo 'DB Verify Initiated...'
                  try {
                      def configJSONData = readFile('database/config.json').trim()
                      if (configJSONData != '') {
                          def slurped = parseJsonText(configJSONData)
                          def db_url = slurped.url
                          def database_engine = slurped.db_engine
                          try {
                              sh "liquibase --changeLogFile='database/verify/liquibase.xml' --driver='" + slurped.driver + "' --classpath='" + slurped.classpath + "' --url='" + db_url + "' --username='" + slurped.username + "' --password='" + slurped.password + "' update"
                              currentBuild.result = 'SUCCESS';
                          } catch(Exception e) {
                              currentBuild.result = 'FAILURE';
                          }
                          if(currentBuild.result == 'FAILURE' || currentBuild.result == 'UNSTABLE' ) {
                              sh "liquibase --changeLogFile='database/rollback/liquibase.xml' --driver='" + slurped.driver + "' --classpath='" + slurped.classpath + "' --url='"+ db_url + "' --username='" + slurped.username + "' --password='" + slurped.password + "' rollbackCount 1"
                          }
                      }
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'Liquibase Verify Stage error while running ' + pipeline_name + ' pipeline',
                          description: BuildIssuePrefix+e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      error('Exception: '+e.getMessage())
                  }
              }
   
              stage('DB Rollback') {
                  echo 'Rollback Initiated...'
                  try {
                      def configJSONData = readFile('database/config.json').trim()
                      if (configJSONData != '') {
                          def slurped = parseJsonText(configJSONData)
                          def db_url = slurped.url
                          def database_engine = slurped.db_engine
                          if (slurped.rollback_count > 0) {
                              sh "liquibase --changeLogFile='database/rollback/liquibase.xml' --driver='" + slurped.driver + "' --classpath='" + slurped.classpath + "' --url='"+ db_url + "' --username='" + slurped.username + "' --password='" + slurped.password + "' update"
                          } else {
                              echo 'Rollback not present'
                          }
                      }
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'Liquibase Rollback Stage error while running ' + pipeline_name + ' pipeline',
                          description: BuildIssuePrefix+e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      error('Exception: '+e.getMessage())
                  }
              }
   
              stage('DB Doc') {
                  echo 'DB Doc Initiated...'
                  try {
                      def configJSONData = readFile('database/config.json').trim()
                      if (configJSONData != '') {
                          def slurped = parseJsonText(configJSONData)
                          def db_url = slurped.url
                          def database_engine = slurped.db_engine
                          def output_directory = '/liquibase/wrk/' + pipeline_name
                          sh "liquibase --changeLogFile='database/verify/liquibase.xml' --driver='" + slurped.driver + "' --classpath='" + slurped.classpath + "' --url='"+ db_url + "' --username='" + slurped.username + "' --password='" + slurped.password + "' dbdoc " + output_directory
                          sh "python3 /opt/script/update_files_script.py " + output_directory + "/"
                      }
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'Liquibase DB Doc Stage error while running ' + pipeline_name + ' pipeline',
                          description: BuildIssuePrefix+e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      error('Exception: '+e.getMessage())
                  }
              }
   
              stage('Merge Developmet To Feature') {
                  echo 'Merging code..'
                  try{
                      sh 'git merge origin/development'
                      sh 'git push ' + GitUrlWithPassword + ' ' + GitBranch
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'Merge Development to Feature Stage error while running ' + pipeline_name + ' pipeline',
                          description: e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      echo('Exception: '+e.class.name)
                  }
              }
   
    stage('Build') {
    echo 'Building..'
    try{
    sh 'npm install'  
    if (!IsScheduled) {
    jiraAddComment comment: JiraCommentMsg , idOrKey: JiraIssueKey, site: JiraSite
    }
    }catch (Exception e) {
     if(IsScheduled){
    def testIssue = [fields: [ project: [key: JiraProjectKey],
    summary: BuildIssuePrefix+e.getMessage(),
    description: BuildIssuePrefix+e.getMessage(),
    issuetype: [id: JiraIssueType],
    assignee: [accountId: JiraIssueAssignee]]],
    response = jiraNewIssue issue: testIssue, site: JiraSite
    }else{
    jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
    }
    echo('Exception: '+e.class.name)
    error('Exception: '+e.getMessage())
    }
    }
   
    stage('Unit Test') {
    echo 'Testing..'
    try{
    sh 'npm test'
    }catch (Exception e) {  if(IsScheduled){
    def testIssue = [fields: [ project: [key: JiraProjectKey],
    summary: UnitTestIssuePrefix+e.getMessage(),
    description: UnitTestIssuePrefix+e.getMessage(),
    issuetype: [id: JiraIssueType],
    assignee: [accountId: JiraIssueAssignee]]],
    response = jiraNewIssue issue: testIssue, site: JiraSite
    }else{
    jiraAddComment comment: UnitTestIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
    }
    echo('Exception: '+e.class.name)
    error('Exception: '+e.getMessage())
    }
    }
   
    stage('Sonar Analysis') {
    echo 'Sonar analyzing..'
    try{
    withSonarQubeEnv(SonarEnv) {
    def dir  = sh(script: 'pwd', returnStdout: true)
    if(dir.startsWith('/var/lib/jenkins')){
    sh '/home/ubuntu/sonar_runner_installation/sonar-scanner-2.6.1/bin/sonar-scanner -Dsonar.login=admin -Dsonar.password=admin -Dsonar.analysis.jira_subtask_id=' + JiraIssueKey
    }else{
    sh 'sonar-scanner -Dsonar.login=admin -Dsonar.password=admin -Dsonar.analysis.jira_subtask_id=' + JiraIssueKey
    }
    }
    }catch (Exception e) {
    if(IsScheduled){
    def testIssue = [fields: [ project: [key: JiraProjectKey],
    summary: SonarAnalysisIssuePrefix+e.getMessage(),
    description: SonarAnalysisIssuePrefix+e.getMessage(),
    issuetype: [id: JiraIssueType],
    assignee: [accountId: JiraIssueAssignee]]],
    response = jiraNewIssue issue: testIssue, site: JiraSite
    }else{
    jiraAddComment comment: SonarAnalysisIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
    }
    echo('Exception: '+e.class.name)
    error('Exception: '+e.getMessage())
    }
   
    }
   
    stage('Quality Gate') {
    //Just in case something goes wrong, pipeline will be killed after a timeout
    script {
    //Reuse taskId previously collected by withSonarQubeEnv
    def qg = waitForQualityGate();
    if (qg.status != 'OK') {
    if(IsScheduled){
    def testIssue = [fields: [ project: [key: JiraProjectKey],
    summary: QualityGateIssuePrefix+e.getMessage(),
    description: QualityGateIssuePrefix+e.getMessage(),
    issuetype: [id: JiraIssueType],
    assignee: [accountId: JiraIssueAssignee]]],
    response = jiraNewIssue issue: testIssue, site: JiraSite
    }else{
    jiraAddComment comment: QualityGateIssuePrefix, idOrKey: JiraIssueKey, site: JiraSite
    error 'Pipeline aborted due to quality gate failure: ${qg.toString()}'
    }
    }
    }
    }
   
    stage('Image Push'){
    try{
    script {
    sh 'git rev-parse HEAD > commit'
    sh 'git symbolic-ref --short HEAD > branch'
    commit = readFile('commit').trim()
    sh "docker login -u 'root' -p 'iauro100' ops-gitlab.iauro.co:5050"
    sh 'docker build --network=host -t ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts:'+commit+' .'
    sh 'docker push ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts:'+commit
    sh 'docker tag ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts:'+commit+' ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts'+DeployEnvironment.toLowerCase()
    sh 'docker push ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts:'+DeployEnvironment.toLowerCase()  
    }
    echo 'Image Pushed....'
    }catch(Exception e){
    echo('Exception: '+e.class.name)  
    error('Exception: '+e.getMessage())
    }
    }
   
          stage('Container Scan'){
       try {
                  sh 'trivy -f json -o scan_data.json ops-gitlab.iauro.co:5050/'+RepoUrl.toLowerCase()+'/artefacts:'+commit
                  sh 'trivy-scan 1599053125167_EJ03HCA.html'
              } catch (Exception e) {
                  if(IsScheduled){
                      def testIssue = [fields: [ project: [key: JiraProjectKey],
                      summary: 'Container Scanning Stage error while running ' + pipeline_name + ' pipeline',
                      description: e.getMessage(),
                      issuetype: [id: JiraIssueType],
                      assignee: [accountId: JiraIssueAssignee]]],
                      response = jiraNewIssue issue: testIssue, site: JiraSite
                  } else{
                      jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                  }
                  echo('Exception: '+e.class.name)
                  error('Exception: '+e.getMessage())
              }
    }
    if(DeployEnvironment == 'preprod') {
       stage('Merge Feature To Developmet') {
           echo 'Merging code..'
    try {
       git url: GitUrl, credentialsId: GitCredentialsId, branch: 'development'
    sh 'git merge '+ GitBranch
    sh 'git push ' + GitUrlWithPassword + ' development'
    } catch (Exception e) {
       echo('Exception: '+e.class.name)
       error('Exception: '+e.getMessage())
    }
    }
    }
   
    stage('Deploy') {
    try{
    def deploymentName = RepoUrl.substring(RepoUrl.lastIndexOf('/') + 1, RepoUrl.length()).toLowerCase() + '-' +  GitBranch.toLowerCase()
    git url: DeployGitUrl, credentialsId: GitCredentialsId, branch: 'master'  
    script {
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/namespace_'+DeployEnvironment.toLowerCase()+'.yaml'
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/secret_' + DeployEnvironment.toLowerCase() +'.yaml -n '+PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/ingress_'+DeployEnvironment.toLowerCase()+'.yaml'
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/deployment_'+DeployEnvironment.toLowerCase()+'.yaml -n '+ PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    try {
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml set image deployment/'+ deploymentName +' ' + deploymentName + '=ops-gitlab.iauro.co:5050/'+ RepoUrl.toLowerCase() +'/artefacts:latest -n '+PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml set image deployment/'+ deploymentName +' ' + deploymentName + '=ops-gitlab.iauro.co:5050/'+ RepoUrl.toLowerCase() +'/artefacts -n '+PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    }
    catch(Exception e)
    {
    echo ('No need to set Image for the very first time')
    echo ('Exception: '+e.class.name)  
     }
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/service_'+DeployEnvironment.toLowerCase()+'.yaml -n '+ PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    sh 'kubectl --kubeconfig='+DeployEnvironment.toLowerCase()+'/kubeconfig_'+DeployEnvironment.toLowerCase()+'.yaml apply -f '+DeployEnvironment.toLowerCase()+'/config-map_'+DeployEnvironment.toLowerCase()+'.yaml -n '+ PortfolioProjectId.toLowerCase() +'-'+DeployEnvironment.toLowerCase()
    jiraAddComment comment: 'Please click on the following link to go to application. ' + urlToTest, idOrKey: GitBranch, site: JiraSite
    }
    }catch(Exception e){
    echo('Exception: '+e.class.name)
    error('Exception: '+e.getMessage())
    }
    }
   
    stage('Test Suite') {
                          try {
                              git url: GitUrl, credentialsId: GitCredentialsId, branch: GitBranch
                              def configJSONData = readFile('e2e/config.json').trim()
                              if (configJSONData != '') {
                                  def slurped = parseJsonText(configJSONData)
                                  if (slurped.path != '') {
                                      dir('e2e') {
                                          sh 'newman run test-cases.json -r htmlextra --reporter-htmlextra-dark-theme --reporter-htmlextra-export tmp/index.html --reporter-htmlextra-browserTitle aurOps | ' + pipeline_name + ' --reporter-htmlextra-title ' + pipeline_name + ' Summary Report'
                                          sh 'mv tmp /project/' + pipeline_name
                                          jiraAddComment comment: 'Please click on the following link to check test suite result. https://ops.iauro.co/test-suites/' + pipeline_name + '/', idOrKey: GitBranch, site: JiraSite
                                      }  
                                  } else {
                                      echo 'config json incomplete...'
                                  }
                              } else {
                                  echo 'config json is blank or not present...'
                              }
                          } catch(Exception e) {
                              if(IsScheduled){
                                  def testIssue = [fields: [ project: [key: JiraProjectKey],
                                  summary: 'Test Suite Stage error while running ' + pipeline_name + ' pipeline',
                                  description: e.getMessage(),
                                  issuetype: [id: JiraIssueType],
                                  assignee: [accountId: JiraIssueAssignee]]],
                                  response = jiraNewIssue issue: testIssue, site: JiraSite
                              } else{
                                  jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                              }
                              echo('Exception: '+e.class.name)
                              error('Exception: '+e.getMessage())
                          }
                      }
   
              stage('DAST'){
                  echo 'in zap'
                  try {
                      echo 'in container'
                      sh '/zap/zap.sh -cmd -quickurl ' + urlToTest + ' -quickout /home/zap/report.xml -quickprogress'
                      sh 'xml2json /home/zap/report.xml /home/zap/report.json'
                      sh 'generate-html /home/zap/report.json ' + pipeline_name + ' ' + urlToTest
                  } catch (Exception e) {
                      if(IsScheduled){
                          def testIssue = [fields: [ project: [key: JiraProjectKey],
                          summary: 'ZAP Build Stage error while running ' + pipeline_name + ' pipeline',
                          description: BuildIssuePrefix+e.getMessage(),
                          issuetype: [id: JiraIssueType],
                          assignee: [accountId: JiraIssueAssignee]]],
                          response = jiraNewIssue issue: testIssue, site: JiraSite
                      } else{
                          jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                      }
                      echo('Exception: '+e.class.name)
                      error('Exception: '+e.getMessage())
                  }
              }
       
   
          stage('rmm'){
       try {
                  sh 'check-rmm ' + swaggerURL + ' 1599053125167_EJ03HCA.html'
              } catch (Exception e) {
                  if(IsScheduled){
                      def testIssue = [fields: [ project: [key: JiraProjectKey],
                      summary: 'RMM Build Stage error while running ' + pipeline_name + ' pipeline',
                      description: BuildIssuePrefix+e.getMessage(),
                      issuetype: [id: JiraIssueType],
                      assignee: [accountId: JiraIssueAssignee]]],
                      response = jiraNewIssue issue: testIssue, site: JiraSite
                  } else{
                      jiraAddComment comment: BuildIssuePrefix+e.getMessage() , idOrKey: JiraIssueKey, site: JiraSite
                  }
                  echo('Exception: '+e.class.name)
                  error('Exception: '+e.getMessage())
              }
    }
   
        }"
