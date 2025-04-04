import resource
import sys

# This file is for running executable python string code in a isolated manner
# Deploy is using docker as well as other tools


def cap_resources():
    _MEMORY_CAP_ = 120 * 1000000

    # This set of rules should prevent resource exaustion
    # Limits in Order: CPU computing time, Memory capacity
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    resource.setrlimit(resource.RLIMIT_AS, (_MEMORY_CAP_, _MEMORY_CAP_))


if __name__ == "__main__":
    code = sys.argv[1]
    cap_resources()
