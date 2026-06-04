#!/bin/bash
# Quick check image URLs return 200
check() {
  code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 12 "$1")
  echo "$code $1"
}
# paste URLs to test
