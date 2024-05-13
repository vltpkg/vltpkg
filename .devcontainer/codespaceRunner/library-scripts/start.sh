#!/bin/bash

GH_OWNER=$GITHUB_USER
GH_REPOSITORY=$GITHUB_REPOSITORY
GH_TOKEN=$GITHUB_TOKEN

HOSTNAME=$(hostname)
RUNNER_SUFFIX="runner"
RUNNER_NAME="${HOSTNAME}-${RUNNER_SUFFIX}"
USER_NAME_LABEL=$( (git config --get user.name) | sed -e 's/ //g')
REPO_NAME_LABEL="$GH_REPOSITORY"

# REG_TOKEN=$(curl -sX POST -H "Accept: application/vnd.github.v3+json" -H "Authorization: token ${GH_TOKEN}" https://api.github.com/repos/${GH_OWNER}/${GH_REPOSITORY}/actions/runners/registration-token | jq .token --raw-output)

/home/vscode/actions-runner/config.sh --unattended --url https://github.com/${GH_OWNER}/${GH_REPOSITORY} --token ${GH_TOKEN} --name ${RUNNER_NAME}  --labels ${USER_NAME_LABEL},${REPO_NAME_LABEL}
/home/vscode/actions-runner/run.sh
