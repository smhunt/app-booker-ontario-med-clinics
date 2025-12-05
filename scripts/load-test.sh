#!/bin/bash
# Load Test Script - 10 simultaneous patients booking for 10 minutes
# This script tests the OAB system under concurrent load

set -e

API_URL="${API_URL:-http://localhost:8080}"
DURATION_MINUTES="${DURATION_MINUTES:-10}"
NUM_PATIENTS="${NUM_PATIENTS:-10}"
BOOKING_INTERVAL="${BOOKING_INTERVAL:-5}"  # seconds between booking attempts per patient

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Statistics (using files for cross-process tracking)
STATS_DIR="/tmp/load_test_stats_$$"
mkdir -p "$STATS_DIR"
echo "0" > "$STATS_DIR/success"
echo "0" > "$STATS_DIR/failure"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_MINUTES * 60))

# Log file for detailed results
LOG_FILE="/tmp/load_test_$(date +%Y%m%d_%H%M%S).log"
echo "Load Test Started at $(date)" > "$LOG_FILE"
echo "Configuration: $NUM_PATIENTS patients, $DURATION_MINUTES minutes, $BOOKING_INTERVAL second intervals" >> "$LOG_FILE"

# Simple increment using atomic append pattern
increment_stat() {
    echo "1" >> "$STATS_DIR/$1"
}

get_stat() {
    wc -l < "$STATS_DIR/$1" 2>/dev/null | tr -d ' ' || echo "0"
}

# Get providers
echo -e "${YELLOW}Fetching providers...${NC}"
PROVIDERS=$(curl -s "$API_URL/providers" | jq -r '.providers[].id' 2>/dev/null || echo "")
if [ -z "$PROVIDERS" ]; then
    echo -e "${RED}Failed to fetch providers. Is the API running?${NC}"
    exit 1
fi
PROVIDER_ARRAY=($PROVIDERS)
NUM_PROVIDERS=${#PROVIDER_ARRAY[@]}
echo -e "${GREEN}Found $NUM_PROVIDERS providers${NC}"

# Get appointment types
echo -e "${YELLOW}Fetching appointment types...${NC}"
APPT_TYPES=$(curl -s "$API_URL/appointment-types" | jq -r '.appointmentTypes[].id' 2>/dev/null || echo "")
if [ -z "$APPT_TYPES" ]; then
    echo -e "${RED}Failed to fetch appointment types. Is the API running?${NC}"
    exit 1
fi
APPT_ARRAY=($APPT_TYPES)
NUM_APPT_TYPES=${#APPT_ARRAY[@]}
echo -e "${GREEN}Found $NUM_APPT_TYPES appointment types${NC}"

# Generate random date (next 30 days)
generate_date() {
    DAYS_AHEAD=$((RANDOM % 30 + 1))
    if [[ "$OSTYPE" == "darwin"* ]]; then
        date -v+${DAYS_AHEAD}d +%Y-%m-%d
    else
        date -d "+$DAYS_AHEAD days" +%Y-%m-%d
    fi
}

# Generate random time slot
generate_time() {
    HOURS=("09" "10" "11" "13" "14" "15")
    HOUR=${HOURS[$((RANDOM % ${#HOURS[@]}))]}
    MINUTE=$(printf "%02d" $((RANDOM % 4 * 15)))
    echo "${HOUR}:${MINUTE}"
}

# Simulate a patient booking session
simulate_patient() {
    local PATIENT_ID=$1
    local PATIENT_NAME="LoadTestPatient$PATIENT_ID"
    local PATIENT_EMAIL="patient$PATIENT_ID@loadtest.example.com"

    while [ $(date +%s) -lt $END_TIME ]; do
        # Select random provider and appointment type
        PROVIDER_ID=${PROVIDER_ARRAY[$((RANDOM % NUM_PROVIDERS))]}
        APPT_TYPE_ID=${APPT_ARRAY[$((RANDOM % NUM_APPT_TYPES))]}
        BOOKING_DATE=$(generate_date)
        BOOKING_TIME=$(generate_time)

        local mod_rand=$((RANDOM % 3))
        if [ $mod_rand -eq 0 ]; then
            MODALITY="video"
        elif [ $mod_rand -eq 1 ]; then
            MODALITY="phone"
        else
            MODALITY="in-person"
        fi

        # Create booking payload
        PAYLOAD=$(cat <<BOOKINGEOF
{
    "providerId": "$PROVIDER_ID",
    "appointmentTypeId": "$APPT_TYPE_ID",
    "date": "$BOOKING_DATE",
    "time": "$BOOKING_TIME",
    "modality": "$MODALITY",
    "patientInfo": {
        "firstName": "$PATIENT_NAME",
        "lastName": "Test",
        "dateOfBirth": "1990-0$((RANDOM % 9 + 1))-0$((RANDOM % 9 + 1))",
        "email": "$PATIENT_EMAIL",
        "preferredNotification": "email"
    },
    "reason": "Load test booking - Patient $PATIENT_ID"
}
BOOKINGEOF
)

        # Time the request
        REQUEST_START=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || date +%s000)

        # Make booking request
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/bookings" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" 2>&1)

        REQUEST_END=$(python3 -c "import time; print(int(time.time()*1000))" 2>/dev/null || date +%s000)
        RESPONSE_TIME=$((REQUEST_END - REQUEST_START))

        # Parse response
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        TIMESTAMP=$(date +"%H:%M:%S")

        if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
            BOOKING_ID=$(echo "$BODY" | jq -r '.id // .booking.id' 2>/dev/null || echo "unknown")
            echo "[${TIMESTAMP}] Patient $PATIENT_ID: SUCCESS - Booking $BOOKING_ID (${RESPONSE_TIME}ms)" >> "$LOG_FILE"
            increment_stat "success"
        else
            ERROR=$(echo "$BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "HTTP $HTTP_CODE")
            echo "[${TIMESTAMP}] Patient $PATIENT_ID: FAILURE - $ERROR (${RESPONSE_TIME}ms)" >> "$LOG_FILE"
            increment_stat "failure"
        fi

        # Wait before next booking attempt
        sleep $BOOKING_INTERVAL
    done
}

# Progress display function
show_progress() {
    while [ $(date +%s) -lt $END_TIME ]; do
        ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
        REMAINING=$(( (END_TIME - $(date +%s)) / 60 ))
        local success=$(get_stat "success")
        local failure=$(get_stat "failure")

        echo -ne "\r${YELLOW}Progress: ${ELAPSED}/${DURATION_MINUTES} min | Success: ${success} | Failures: ${failure}${NC}      "
        sleep 5
    done
    echo ""
}

echo ""
echo -e "${GREEN}=== Starting Load Test ===${NC}"
echo -e "Duration: ${DURATION_MINUTES} minutes"
echo -e "Concurrent patients: ${NUM_PATIENTS}"
echo -e "Booking interval: ${BOOKING_INTERVAL} seconds per patient"
echo -e "Log file: ${LOG_FILE}"
echo ""

# Start progress display in background
show_progress &
PROGRESS_PID=$!

# Start patient simulations in parallel
PIDS=()
for i in $(seq 1 $NUM_PATIENTS); do
    simulate_patient $i &
    PIDS+=($!)
done

# Wait for all patients to complete
for PID in "${PIDS[@]}"; do
    wait $PID 2>/dev/null
done

# Stop progress display
kill $PROGRESS_PID 2>/dev/null || true

# Calculate final stats
TOTAL_DURATION=$(( $(date +%s) - START_TIME ))
TOTAL_SUCCESS=$(get_stat "success")
TOTAL_FAILURE=$(get_stat "failure")
TOTAL_REQUESTS=$((TOTAL_SUCCESS + TOTAL_FAILURE))

if [ $TOTAL_REQUESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; $TOTAL_SUCCESS * 100 / $TOTAL_REQUESTS" | bc 2>/dev/null || python3 -c "print(round($TOTAL_SUCCESS * 100 / $TOTAL_REQUESTS, 2))")
else
    SUCCESS_RATE=0
fi

echo ""
echo -e "${GREEN}=== Load Test Complete ===${NC}"
echo "========================================"
echo "Duration: $TOTAL_DURATION seconds"
echo "Total Requests: $TOTAL_REQUESTS"
echo "Successful: $TOTAL_SUCCESS"
echo "Failed: $TOTAL_FAILURE"
echo "Success Rate: ${SUCCESS_RATE}%"
echo "========================================"
echo "Detailed log: $LOG_FILE"
echo ""

# Summary to log file
echo "" >> "$LOG_FILE"
echo "=== FINAL SUMMARY ===" >> "$LOG_FILE"
echo "Duration: $TOTAL_DURATION seconds" >> "$LOG_FILE"
echo "Total Requests: $TOTAL_REQUESTS" >> "$LOG_FILE"
echo "Successful: $TOTAL_SUCCESS" >> "$LOG_FILE"
echo "Failed: $TOTAL_FAILURE" >> "$LOG_FILE"
echo "Success Rate: ${SUCCESS_RATE}%" >> "$LOG_FILE"
echo "Load Test Ended at $(date)" >> "$LOG_FILE"

# Cleanup
rm -rf "$STATS_DIR"

# Check for concerning patterns
if [ "$SUCCESS_RATE" != "0" ]; then
    if (( $(echo "$SUCCESS_RATE < 90" | bc -l 2>/dev/null || python3 -c "print(1 if $SUCCESS_RATE < 90 else 0)") )); then
        echo -e "${RED}WARNING: Success rate below 90%! Review logs for issues.${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}Tail of detailed log:${NC}"
tail -20 "$LOG_FILE"
