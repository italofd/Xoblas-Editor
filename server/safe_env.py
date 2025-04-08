import resource

# This file is for running executable python string code in a isolated manner
# Deploy is using docker as well as other tools


def cap_resources():
    _MEMORY_CAP_ = 120 * 1000000

    # This set of rules should prevent resource exaustion
    # Limits in Order: CPU computing time, Memory capacity, std output buffer size
    resource.setrlimit(resource.RLIMIT_CPU, (1, 1))
    resource.setrlimit(resource.RLIMIT_AS, (_MEMORY_CAP_, _MEMORY_CAP_))
    resource.setrlimit(resource.RLIMIT_FSIZE, (400, 400))


if __name__ == "__main__":
    cap_resources()
